import { z } from 'zod'
import { privateProcedure } from '../procedure'
import { router } from '../trpc'
import { Attachment } from '@/entities/attachment'
import AttachmentService from '@/server/services/attachment'
import { EAttachmentStatus, EUserRole, EValueType } from '@/entities/enum'
import { ImageUtil } from '../utils/ImageUtil'
import { ECompressPreset } from '@/constants/enum'
import mine from 'mime'
import { classifyMine } from '../utils/file'

const getAttachmentURL = async (attachment: Attachment, baseUrl = 'http://localhost:3001') => {
  const prevName = `${attachment.fileName}_preview.jpg`
  const highName = `${attachment.fileName}_high.jpg`
  const [imageInfo, imagePreviewInfo, imageHighInfo] = await Promise.all([
    AttachmentService.getInstance().getFileURL(attachment.fileName, 3600 * 24, baseUrl),
    AttachmentService.getInstance().getFileURL(prevName, 3600 * 24, baseUrl),
    AttachmentService.getInstance().getFileURL(highName, 3600 * 24, baseUrl)
  ])
  return {
    type: attachment.type,
    raw: imageInfo,
    preview: imagePreviewInfo || imageInfo,
    high: imageHighInfo || imageInfo
  }
}

export const attachmentRouter = router({
  get: privateProcedure
    .input(
      z.object({
        id: z.string()
      })
    )
    .query(async ({ ctx, input }) => {
      const attachment = await ctx.em.findOne(Attachment, { id: input.id })
      if (!attachment) {
        return null
      }
      return getAttachmentURL(attachment, ctx.baseUrl)
    }),
  getList: privateProcedure.input(z.array(z.string())).query(async ({ ctx, input }) => {
    const attachments = await ctx.em.find(Attachment, { id: { $in: input } })
    return Promise.all(
      attachments.map(async (attachment) => {
        return {
          id: attachment.id,
          urls: await getAttachmentURL(attachment, ctx.baseUrl)
        }
      })
    )
  }),
  isFavorite: privateProcedure
    .input(
      z.object({
        id: z.string()
      })
    )
    .query(async ({ ctx, input }) => {
      const attachment = await ctx.em.findOneOrFail(Attachment, { id: input.id }, { populate: ['likers'] })
      return attachment.likers.exists((liker) => liker.id === ctx.session.user.id)
    }),
  setFavorite: privateProcedure
    .input(
      z.object({
        id: z.string(),
        favorite: z.boolean()
      })
    )
    .mutation(async ({ input, ctx }) => {
      const attachment = await ctx.em.findOneOrFail(Attachment, { id: input.id }, { populate: ['likers'] })
      const user = await ctx.session.getFullUser()
      if (input.favorite) {
        attachment.likers.add(user)
      } else {
        attachment.likers.remove(user)
      }
      await ctx.em.flush()
      return true
    }),
  upload: privateProcedure.input(z.instanceof(FormData)).mutation(async ({ input, ctx }) => {
    const schema = z.object({
      file: z.instanceof(File),
      name: z.string(),
      /**
       * The maximum width and height of the image
       */
      maxWidthHeightSize: z
        .string()
        .transform((v) => Number(v))
        .nullable()
        .optional(),
      /**
       * The type of compress image
       */
      type: z.nativeEnum(ECompressPreset).nullable().optional()
    })
    const parsedData = schema.safeParse({
      file: input.get('file'),
      name: input.get('name'),
      maxWidthHeightSize: input.get('maxWidthHeightSize'),
      type: input.get('type')
    })
    if (!parsedData.success) {
      console.error(parsedData.error)
      throw new Error('Invalid input')
    }
    const inputData = parsedData.data

    const storageService = AttachmentService.getInstance()
    const file = inputData.file
    const buffArr = await file.arrayBuffer()
    let buff = Buffer.from(buffArr)
    const imgObj = new ImageUtil(buff)

    // Check if the file is an image
    if (imgObj.isValid) {
      if (inputData.maxWidthHeightSize) {
        await imgObj.ensureMax(inputData.maxWidthHeightSize)
      }
      switch (inputData.type) {
        case ECompressPreset.PREVIEW:
          buff = await imgObj.intoPreviewJPG()
          break
        case ECompressPreset.HIGH_JPG:
          buff = await imgObj.intoHighJPG()
          break
        case ECompressPreset.JPG:
          buff = await imgObj.intoJPG()
          break
      }
    }
    /**
     * Avoid uploading the same file multiple times
     */
    const fileMd5 = await Attachment.fileMD5(buff)
    const fileExtension = file.name.split('.').pop()
    const newName = `${fileMd5}.${fileExtension}`
    const mineType = fileExtension ? mine.getType(fileExtension) : ''
    const fileType = mineType ? classifyMine(mineType) : EValueType.File
    const size = buff.byteLength

    const existingAttachment = await ctx.em.findOne(Attachment, { fileName: newName })
    if (existingAttachment) {
      if (existingAttachment.status === EAttachmentStatus.UPLOADED) {
        return existingAttachment
      } else {
        await ctx.em.removeAndFlush(existingAttachment)
      }
    }
    const attachment = ctx.em.create(Attachment, { fileName: newName, type: fileType, size }, { partial: true })
    await ctx.em.persistAndFlush(attachment)
    try {
      if (imgObj.isValid && inputData.type !== ECompressPreset.PREVIEW) {
        try {
          const previewObj = await imgObj.ensureMax(1024)
          const previewBuff = await previewObj.intoPreviewJPG()
          await storageService.uploadFile(previewBuff, newName + '_preview.jpg')
        } catch (e) {
          console.error('Failed to create preview image', newName, e)
        }
      }
      await storageService.uploadFile(buff, newName)
      attachment.status = EAttachmentStatus.UPLOADED
      await ctx.em.persistAndFlush(attachment)
      return attachment
    } catch (e) {
      attachment.status = EAttachmentStatus.FAILED
      await ctx.em.persistAndFlush(attachment)
      return attachment
    }
  }),
  taskDetail: privateProcedure.input(z.string()).query(async ({ ctx, input }) => {
    const user = ctx.session.user
    const permFilter =
      ctx.session.user!.role === EUserRole.Admin
        ? {}
        : {
            task: {
              trigger: {
                $or: [
                  { user: { id: user.id } },
                  {
                    token: {
                      createdBy: { id: user.id }
                    }
                  }
                ]
              }
            }
          }
    return await ctx.em.findOneOrFail(
      Attachment,
      {
        id: input,
        ...permFilter
      },
      {
        populate: ['workflow', 'task']
      }
    )
  }),
  getFileUrlMutation: privateProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    const attachment = await ctx.em.findOneOrFail(Attachment, { id: input })
    return getAttachmentURL(attachment, ctx.baseUrl)
  })
})
