import { z } from 'zod'
import { privateProcedure } from '../procedure'
import { router } from '../trpc'
import { UserNotification } from '@/entities/user_notifications'
import CachingService from '@/services/caching.service'
import { EventEmitter, on } from 'node:events'

export const UserNotificationEE = new EventEmitter()
export const userNotificationRouter = router({
  list: privateProcedure
    .input(
      z.object({
        search: z.string().optional(),
        limit: z.number().min(1).max(100).nullish(),
        cursor: z.string().nullish(),
        direction: z.enum(['forward', 'backward'])
      })
    )
    .query(async ({ input, ctx }) => {
      const limit = input.limit ?? 50
      const { cursor, direction } = input

      const data = await ctx.em.findByCursor(
        UserNotification,
        {
          user: ctx.session.user!
        },
        direction === 'forward'
          ? {
              first: limit,
              after: { endCursor: cursor || null },
              orderBy: { createdAt: 'DESC' }
            }
          : {
              last: limit,
              before: { startCursor: cursor || null },
              orderBy: { createdAt: 'DESC' }
            }
      )
      return {
        items: data.items,
        nextCursor: data.endCursor
      }
    }),
  markAsRead: privateProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
    const notification = await ctx.em.findOneOrFail(UserNotification, {
      id: input.id,
      user: ctx.session.user!
    })
    notification.read = true
    await ctx.em.flush()
    await CachingService.getInstance().set('USER_NOTIFICATION', ctx.session.user!.id, Date.now())
  }),
  markAsReadAll: privateProcedure.mutation(async ({ ctx }) => {
    await ctx.em.nativeUpdate(UserNotification, { user: ctx.session.user! }, { read: true })
    await CachingService.getInstance().set('USER_NOTIFICATION', ctx.session.user!.id, Date.now())
  }),
  delete: privateProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
    const noti = await ctx.em.findOneOrFail(UserNotification, {
      id: input.id,
      user: ctx.session.user!
    })
    await ctx.em.removeAndFlush(noti)
  }),
  deleteAll: privateProcedure.mutation(async ({ ctx }) => {
    await ctx.em.nativeDelete(UserNotification, {
      user: ctx.session.user!
    })
    await CachingService.getInstance().set('USER_NOTIFICATION', ctx.session.user!.id, Date.now())
  }),
  watch: privateProcedure.subscription(async function* ({ signal, ctx }) {
    const user = ctx.session.user!
    for await (const [data] of on(UserNotificationEE, `noti:${user.id}`, {
      // Passing the AbortSignal from the request automatically cancels the event emitter when the request is aborted
      signal: signal
    })) {
      const post = data as {
        title: string
        description?: string
      }
      yield post
    }
  })
})
