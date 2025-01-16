import { z } from 'zod'
import { adminProcedure, privateProcedure } from '../procedure'
import { router } from '../trpc'
import { WorkflowTask } from '@/entities/workflow_task'
import { EClientStatus, ETaskStatus, ETriggerBy, EUserRole } from '@/entities/enum'
import { observable } from '@trpc/server/observable'
import CachingService from '@/server/services/caching'

const cacher = CachingService.getInstance()

export const taskRouter = router({
  lastTasks: adminProcedure
    .input(
      z.object({
        limit: z.number().default(30),
        clientId: z.string().optional()
      })
    )
    .subscription(async function* ({ ctx, input, signal }) {
      let trigger: any = {}
      const fn = async () => {
        if (ctx.session.user!.role !== EUserRole.Admin) {
          trigger = {
            type: ETriggerBy.User,
            user: { id: ctx.session.user!.id }
          }
        }
        if (!input.clientId) {
          return await ctx.em.find(
            WorkflowTask,
            {
              trigger,
              status: {
                $nin: [ETaskStatus.Parent]
              }
            },
            { limit: input.limit, orderBy: { createdAt: 'DESC' }, populate: ['trigger', 'trigger.user'] }
          )
        }
        return await ctx.em.find(
          WorkflowTask,
          {
            trigger,
            status: {
              $nin: [ETaskStatus.Parent]
            },
            client: { id: input.clientId }
          },
          { limit: input.limit, orderBy: { createdAt: 'DESC' }, populate: ['trigger', 'trigger.user'] }
        )
      }
      yield await fn()
      if (!input.clientId) {
        for await (const _ of cacher.onCategoryGenerator('LAST_TASK_CLIENT', signal)) {
          yield await fn()
        }
      } else {
        for await (const _ of cacher.onGenerator('LAST_TASK_CLIENT', input.clientId, signal)) {
          yield await fn()
        }
      }
    }),
  countStats: privateProcedure.subscription(async function* ({ ctx }) {
    if (!ctx.session?.user) {
      throw new Error('Unauthorized')
    }
    let trigger: any = {}
    if (ctx.session.user.role !== EUserRole.Admin) {
      trigger = {
        type: ETriggerBy.User,
        user: { id: ctx.session.user.id }
      }
    }
    const getStats = async () => {
      const executed = await ctx.em.count(
        WorkflowTask,
        {
          trigger,
          status: {
            $in: [ETaskStatus.Success, ETaskStatus.Failed]
          }
        },
        { populate: ['trigger', 'trigger.user'] }
      )
      const pending = await ctx.em.count(
        WorkflowTask,
        {
          trigger,
          status: {
            $nin: [ETaskStatus.Success, ETaskStatus.Failed, ETaskStatus.Parent]
          }
        },
        { populate: ['trigger', 'trigger.user'] }
      )
      return {
        pending,
        executed
      }
    }
    yield await getStats()
    for await (const data of cacher.onCategoryGenerator('CLIENT_STATUS')) {
      if ([EClientStatus.Executing, EClientStatus.Online].includes(data.detail.value)) {
        yield await getStats()
      }
    }
  })
})
