import { Tag } from '@/entities/tag'
import { adminProcedure, privateProcedure } from '../procedure'
import { router } from '../trpc'
import { z } from 'zod'
import { observable } from '@trpc/server/observable'
import { ETaskStatus, ETriggerBy, EUserRole } from '@/entities/enum'
import CachingService from '@/services/caching.service'
import { WorkflowTask } from '@/entities/workflow_task'

export const watchRouter = router({
  historyList: privateProcedure.subscription(async ({ ctx }) => {
    const cacher = CachingService.getInstance()
    return observable<number>((subscriber) => {
      if (ctx.session.user!.role === EUserRole.Admin) {
        return cacher.onCategory('HISTORY_LIST', (ev) => {
          subscriber.next(ev.detail.value)
        })
      } else {
        return cacher.on('HISTORY_LIST', ctx.session.user!.id, (ev) => {
          subscriber.next(ev.detail)
        })
      }
    })
  }),
  historyItem: privateProcedure.input(z.string()).subscription(async ({ input, ctx }) => {
    const cacher = CachingService.getInstance()
    if (ctx.session.user!.role !== EUserRole.Admin) {
      const taskInfo = await ctx.em.findOneOrFail(
        WorkflowTask,
        { id: input },
        { populate: ['trigger', 'trigger.user', 'trigger.token'] }
      )
      if (taskInfo.trigger.type === ETriggerBy.User && taskInfo.trigger?.user?.id !== ctx.session.user!.id) {
        throw new Error('Unauthorized')
      }
      if (
        taskInfo.trigger.type === ETriggerBy.Token &&
        taskInfo.trigger?.token?.createdBy.id !== ctx.session.user!.id
      ) {
        throw new Error('Unauthorized')
      }
    }
    return observable<number>((subscriber) => {
      return cacher.onCategory('HISTORY_ITEM', (ev) => {
        if (ev.detail.id === input) subscriber.next(ev.detail.value)
      })
    })
  }),
  workflow: privateProcedure.input(z.string()).subscription(async ({ input, ctx }) => {
    const cacher = CachingService.getInstance()
    return observable<number>((subscriber) => {
      return cacher.on('WORKFLOW', input, (ev) => {
        subscriber.next(ev.detail)
      })
    })
  }),
  balance: privateProcedure.subscription(async ({ ctx }) => {
    const cacher = CachingService.getInstance()
    return observable<number>((subscriber) => {
      subscriber.next(ctx.session.user!.balance)
      return cacher.on('USER_BALANCE', ctx.session.user!.id, (ev) => {
        subscriber.next(ev.detail)
      })
    })
  }),
  notification: privateProcedure.subscription(async ({ ctx }) => {
    const cacher = CachingService.getInstance()
    return observable<number>((subscriber) => {
      return cacher.on('USER_NOTIFICATION', ctx.session.user!.id, (ev) => {
        subscriber.next(ev.detail)
      })
    })
  }),
  executing: privateProcedure.subscription(async ({ ctx }) => {
    const cacher = CachingService.getInstance()
    return observable<boolean>((subscriber) => {
      return cacher.on('USER_EXECUTING_TASK', ctx.session.user!.id, async (ev) => {
        const task = await ctx.em.findOne(WorkflowTask, {
          trigger: {
            $or: [
              {
                user: {
                  id: ctx.session.user?.id
                }
              },
              {
                token: {
                  createdBy: ctx.session.user?.id
                }
              }
            ]
          },
          status: {
            $nin: [ETaskStatus.Failed, ETaskStatus.Parent]
          },
          outputValues: null,
          attachments: null,
          executionTime: null
        })
        subscriber.next(!!task)
      })
    })
  }),
  preview: privateProcedure.input(z.object({ taskId: z.string() })).subscription(async ({ input, ctx }) => {
    const cacher = CachingService.getInstance()
    return observable<string>((subscriber) => {
      return cacher.on('PREVIEW', input.taskId, (ev) => {
        subscriber.next(ev.detail.blob64)
      })
    })
  })
})
