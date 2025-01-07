import { z } from 'zod'
import { privateProcedure } from '../procedure'
import { router } from '../trpc'
import { Attachment } from '@/entities/attachment'
import AttachmentService from '@/services/attachment.service'
import { EAttachmentStatus, EUserRole } from '@/entities/enum'
import { ImageUtil } from '../utils/ImageUtil'
import { ECompressPreset } from '@/constants/enum'

const getAttachmentURL = async (attachment: Attachment) => {
  const prevName = `${attachment.fileName}_preview.jpg`
  const highName = `${attachment.fileName}_high.jpg`
  const [imageInfo, imagePreviewInfo, imageHighInfo] = await Promise.all([
    AttachmentService.getInstance().getFileURL(attachment.fileName, 3600 * 24),
    AttachmentService.getInstance().getFileURL(prevName, 3600 * 24),
    AttachmentService.getInstance().getFileURL(highName, 3600 * 24)
  ])
  return {
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
      return getAttachmentURL(attachment)
    }),
  getList: privateProcedure.input(z.array(z.string())).query(async ({ ctx, input }) => {
    const attachments = await ctx.em.find(Attachment, { id: { $in: input } })
    return Promise.all(
      attachments.map(async (attachment) => {
        return {
          id: attachment.id,
          urls: await getAttachmentURL(attachment)
        }
      })
    )
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
    /**
     * Avoid uploading the same file multiple times
     */
    const fileMd5 = await Attachment.fileMD5(buff)
    const fileExtendsion = file.name.split('.').pop()
    const newName = `${fileMd5}.${fileExtendsion}`
    const size = buff.byteLength

    const existingAttachment = await ctx.em.findOne(Attachment, { fileName: newName })
    if (existingAttachment) {
      if (existingAttachment.status === EAttachmentStatus.UPLOADED) {
        return existingAttachment
      } else {
        await ctx.em.removeAndFlush(existingAttachment)
      }
    }
    const attachment = ctx.em.create(Attachment, { fileName: newName, size }, { partial: true })
    await ctx.em.persistAndFlush(attachment)
    try {
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
    const permFilter =
      ctx.session.user!.role === EUserRole.Admin
        ? {}
        : {
            task: {
              trigger: {
                $or: [
                  { user: ctx.session.user },
                  {
                    token: {
                      createdBy: ctx.session.user
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
  })
})
