import { privateProcedure } from '../procedure'
import { router } from '../trpc'
import { z } from 'zod'
import { ETaskStatus, ETriggerBy, EUserRole } from '@/entities/enum'
import CachingService from '@/server/services/caching'
import { WorkflowTask } from '@/entities/workflow_task'

export const watchRouter = router({
  historyList: privateProcedure.subscription(async function* ({ ctx, signal }) {
    const cacher = CachingService.getInstance()
    if (ctx.session.user!.role === EUserRole.Admin) {
      for await (const data of cacher.onCategoryGenerator('HISTORY_LIST', signal)) {
        yield data.detail.value
      }
    } else {
      for await (const data of cacher.onGenerator('HISTORY_LIST', ctx.session.user!.id, signal)) {
        yield data.detail
      }
    }
  }),
  historyItem: privateProcedure.input(z.string()).subscription(async function* ({ input, ctx, signal }) {
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
    for await (const data of cacher.onGenerator('HISTORY_ITEM', input, signal)) {
      yield data.detail
    }
  }),
  workflow: privateProcedure.input(z.string()).subscription(async function* ({ input, signal }) {
    const cacher = CachingService.getInstance()
    for await (const data of cacher.onGenerator('WORKFLOW', input, signal)) {
      yield data.detail
    }
  }),
  balance: privateProcedure.subscription(async function* ({ ctx, signal }) {
    const cacher = CachingService.getInstance()
    yield ctx.session.user!.balance
    for await (const data of cacher.onGenerator('USER_BALANCE', ctx.session.user!.id, signal)) {
      yield data.detail
    }
  }),
  notification: privateProcedure.subscription(async function* ({ ctx, signal }) {
    const cacher = CachingService.getInstance()

    for await (const data of cacher.onGenerator('USER_NOTIFICATION', ctx.session.user!.id, signal)) {
      yield data.detail
    }
  }),
  executing: privateProcedure.subscription(async function* ({ ctx, signal }) {
    const cacher = CachingService.getInstance()

    for await (const _ of cacher.onGenerator('USER_EXECUTING_TASK', ctx.session.user!.id, signal)) {
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
      yield !!task
    }
  }),
  preview: privateProcedure.input(z.object({ taskId: z.string() })).subscription(async function* ({ input, signal }) {
    const cacher = CachingService.getInstance()

    for await (const data of cacher.onGenerator('PREVIEW', input.taskId, signal)) {
      yield data.detail.blob64
    }
  })
})
