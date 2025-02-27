import { AttachmentTag } from '@/entities/attachment_tag'
import { privateProcedure } from '../procedure'
import { router } from '../trpc'
import { z } from 'zod'
import { EUserRole } from '@/entities/enum'
import { Attachment } from '@/entities/attachment'
import { generateColorByText } from '../utils/tools'

export const attachmentTagRouter = router({
  list: privateProcedure.query(async ({ ctx }) => {
    const filter = ctx.session.user.role !== EUserRole.Admin ? { owner: ctx.session.user } : {}
    const list = await ctx.em.find(AttachmentTag, filter)
    return Promise.all(
      list.map(async (tag) => {
        return {
          info: tag,
          total: await tag.attachments.loadCount()
        }
      })
    )
  }),
  create: privateProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    const tag = ctx.em.create(
      AttachmentTag,
      { name: input, owner: ctx.session.user, color: generateColorByText(input) },
      { partial: true }
    )
    await ctx.em.persistAndFlush(tag)
    return tag
  }),
  update: privateProcedure
    .input(z.object({ id: z.string(), name: z.string().optional(), color: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const tag = await ctx.em.findOneOrFail(AttachmentTag, { id: input.id })
      if (tag.owner !== ctx.session.user && ctx.session.user.role !== EUserRole.Admin) {
        throw new Error('Permission denied')
      }
      tag.name = input.name ?? tag.name
      tag.color = input.color ?? tag.color
      await ctx.em.persistAndFlush(tag)
      return tag
    }),
  delete: privateProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    const tag = await ctx.em.findOneOrFail(AttachmentTag, { name: input })
    if (tag.owner !== ctx.session.user && ctx.session.user.role !== EUserRole.Admin) {
      throw new Error('Permission denied')
    }
    await ctx.em.removeAndFlush(tag)
    return true
  }),
  getAttachmentTags: privateProcedure.input(z.string()).query(async ({ ctx, input }) => {
    const attachment = await ctx.em.findOneOrFail(Attachment, { id: input }, { populate: ['tags.*'] })
    // TODO: Fix this type casting
    return attachment.tags.toArray() as any as AttachmentTag[]
  }),
  setAttachmentTags: privateProcedure
    .input(
      z.object({
        attachmentId: z.string(),
        tags: z.array(z.string())
      })
    )
    .mutation(async ({ ctx, input }) => {
      const attachment = await ctx.em.findOneOrFail(Attachment, { id: input.attachmentId })
      const tags = await ctx.em.find(AttachmentTag, { id: { $in: input.tags } })
      console.log(tags)
      if (tags.some((tag) => tag.owner !== ctx.session.user) && ctx.session.user.role !== EUserRole.Admin) {
        throw new Error('Permission denied')
      }
      if (tags.length === 0) {
        attachment.tags.removeAll()
      } else {
        attachment.tags.set(tags)
      }
      await ctx.em.persistAndFlush(attachment)
      return true
    })
})
