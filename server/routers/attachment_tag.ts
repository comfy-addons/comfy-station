import { AttachmentTag } from '@/entities/attachment_tag'
import { adminProcedure, privateProcedure } from '../procedure'
import { router } from '../trpc'
import { z } from 'zod'
import { EUserRole } from '@/entities/enum'
import { Attachment } from '@/entities/attachment'

export const attachmentTagRouter = router({
  list: privateProcedure.query(async ({ ctx }) => {
    const list = await ctx.em.find(AttachmentTag, { owner: ctx.session.user })
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
    const tag = ctx.em.create(AttachmentTag, { name: input, owner: ctx.session.user }, { partial: true })
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
    const attachment = await ctx.em.findOneOrFail(Attachment, { id: input }, { populate: ['tags'] })
    return attachment.tags.getItems()
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
      const tags = await ctx.em.find(AttachmentTag, { name: { $in: input.tags } })
      if (tags.some((tag) => tag.owner !== ctx.session.user) && ctx.session.user.role !== EUserRole.Admin) {
        throw new Error('Permission denied')
      }
      attachment.tags.set(tags)
      await ctx.em.flush()
      return true
    })
})
