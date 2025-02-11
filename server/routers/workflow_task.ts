import { z } from 'zod'
import { privateProcedure } from '../procedure'
import { router } from '../trpc'
import { WorkflowTask } from '@/entities/workflow_task'
import {
  ETaskStatus,
  ETriggerBy,
  EUserRole,
  EValueType,
  EValueUtilityType,
  EWorkflowActiveStatus
} from '@/entities/enum'
import { Workflow } from '@/entities/workflow'
import { Trigger } from '@/entities/trigger'
import CachingService from '@/server/services/caching'
import { v4 } from 'uuid'
import { WorkflowTaskEvent } from '@/entities/workflow_task_event'
import { convertObjectToArrayOfObjects, delay, seed } from '@/utils/tools'
import AttachmentService from '@/server/services/attachment'
import { Attachment } from '@/entities/attachment'

export const workflowTaskRouter = router({
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

      const extra =
        ctx.session.user!.role === EUserRole.Admin // Admin can see all tasks
          ? {}
          : ctx.session.user!.role === EUserRole.Editor
            ? {
                trigger: {
                  user: {
                    id: ctx.session.user?.id
                  }
                }
              }
            : {
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
                workflow: {
                  status: {
                    $ne: EWorkflowActiveStatus.Deleted
                  }
                }
              }

      const data = await ctx.em.findByCursor(
        WorkflowTask,
        {
          parent: null,
          ...extra
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
  detail: privateProcedure.input(z.string()).query(async ({ input, ctx }) => {
    const extra =
      ctx.session.user!.role === EUserRole.Admin // Admin can see all tasks
        ? {}
        : {
            workflow: {
              status: {
                $ne: EWorkflowActiveStatus.Deleted
              }
            }
          }
    const task = await ctx.em.findOneOrFail(
      WorkflowTask,
      { id: input, ...extra },
      {
        populate: [
          'workflow',
          'trigger.*',
          'events',
          'subTasks',
          'attachments.*',
          'subTasks.attachments.*',
          'subTasks.events.*'
        ]
      }
    )
    if (ctx.session.user?.role && ctx.session.user?.role === EUserRole.Admin) {
      return task
    }
    if (task.trigger.user?.id === ctx.session.user?.id || task.trigger.token?.createdBy?.id === ctx.session.user?.id) {
      return task
    }
    throw new Error('Unauthorized')
  }),
  delete: privateProcedure.input(z.string()).mutation(async ({ input, ctx }) => {
    const task = await ctx.em.findOneOrFail(WorkflowTask, { id: input }, { populate: ['trigger.*', 'attachments'] })
    let allow = false
    if (ctx.session.user!.role === EUserRole.Admin) {
      allow = true
    }
    if (task.trigger.user?.id === ctx.session.user?.id || task.trigger.token?.createdBy?.id === ctx.session.user?.id) {
      allow = true
    }
    if (allow) {
      for (const attachment of task.attachments) {
        ctx.em.remove(attachment)
      }
      await Promise.all([
        ctx.em.remove(task).flush(),
        CachingService.getInstance().set('LAST_TASK_CLIENT', -1, Date.now()),
        CachingService.getInstance().set('WORKFLOW', task.id, Date.now()),
        CachingService.getInstance().set('HISTORY_LIST', ctx.session.user!.id, Date.now())
      ])
      return true
    }
    throw new Error('Unauthorized')
  }),
  getOutputAttachmentUrls: privateProcedure.input(z.string()).query(async ({ input, ctx }) => {
    const task = await ctx.em.findOneOrFail(WorkflowTask, { id: input }, { populate: ['subTasks.events'] })
    let fileNames: { id: string; filename: string; type?: EValueType }[] = []

    if (task.status !== ETaskStatus.Parent) {
      const attachments = await ctx.em.find(Attachment, {
        task
      })
      fileNames = attachments.map((a) => ({ id: a.id, filename: a.fileName, type: a.type }))
    } else {
      const subTaskIds = task.subTasks.map((t) => t.id)
      const attachments = await ctx.em.find(Attachment, {
        task: {
          id: {
            $in: subTaskIds
          }
        }
      })
      fileNames = attachments.map((a) => ({ id: a.id, filename: a.fileName, type: a.type }))
    }
    return Promise.all(
      fileNames.map(async (info) => {
        const { id, filename, type } = info
        const prevName = `${filename}_preview.jpg`
        const highName = `${filename}_high.jpg`
        const [imageInfo, imagePreviewInfo, imageHighInfo] = await Promise.all([
          AttachmentService.getInstance().getFileURL(filename, 3600 * 24, ctx.baseUrl),
          AttachmentService.getInstance().getFileURL(prevName, 3600 * 24, ctx.baseUrl),
          AttachmentService.getInstance().getFileURL(highName, 3600 * 24, ctx.baseUrl)
        ])
        return {
          id,
          type,
          raw: imageInfo,
          preview: imagePreviewInfo || imageInfo,
          high: imageHighInfo || imageInfo
        }
      })
    )
  }),
  get: privateProcedure.input(z.string()).query(async ({ input, ctx }) => {
    const extra =
      ctx.session.user!.role === EUserRole.Admin // Admin can see all tasks
        ? {}
        : {
            workflow: {
              status: {
                $ne: EWorkflowActiveStatus.Deleted
              }
            }
          }
    const task = await ctx.em.findOneOrFail(WorkflowTask, { id: input, ...extra }, { populate: ['trigger', 'events'] })
    if (ctx.session.user?.role && ctx.session.user?.role === EUserRole.Admin) {
      return task
    }
    if (task.trigger.type === ETriggerBy.User && task.trigger.user!.id === ctx.session.user?.id) {
      return task
    }
    throw new Error('Unauthorized')
  }),
  workflowTaskStats: privateProcedure.input(z.string()).query(async ({ input, ctx }) => {
    const isUserLevel = !ctx.session.user?.role || ctx.session.user?.role < EUserRole.Editor
    const trigger = isUserLevel ? { user: { id: ctx.session.user?.id } } : {}
    const [success, failed, isExecuting] = await Promise.all([
      ctx.em.count(WorkflowTask, {
        workflow: {
          id: input
        },
        trigger,
        status: ETaskStatus.Success
      }),
      ctx.em.count(WorkflowTask, {
        workflow: {
          id: input
        },
        trigger,
        status: ETaskStatus.Failed
      }),
      ctx.em.findOne(WorkflowTask, {
        workflow: {
          id: input
        },
        trigger,
        status: { $in: [ETaskStatus.Queuing, ETaskStatus.Pending, ETaskStatus.Running] }
      })
    ])
    return {
      success,
      failed,
      isExecuting: !!isExecuting
    }
  }),
  executeTask: privateProcedure
    .input(
      z.object({
        input: z.record(z.string(), z.union([z.string().optional(), z.number(), z.array(z.string())])),
        workflowId: z.string(),
        repeat: z.number().optional()
      })
    )
    .mutation(async ({ input, ctx }) => {
      const extra =
        ctx.session.user!.role > EUserRole.User // Admin can see all tasks
          ? {}
          : {
              status: EWorkflowActiveStatus.Activated
            }
      const workflow = await ctx.em.findOneOrFail(Workflow, {
        id: input.workflowId,
        ...extra
      })
      for (const key in input.input) {
        const keyConfig = workflow.mapInput?.[key]
        if (!keyConfig) continue
        if (keyConfig.type === EValueType.Number) {
          const temp = Number(input.input[key])
          if (keyConfig.min && temp < keyConfig.min) {
            throw new Error(`Value of ${key} is less than min value`)
          }
          if (keyConfig.max && temp > keyConfig.max) {
            throw new Error(`Value of ${key} is greater than max value`)
          }
        }
        if (keyConfig.type === EValueType.File || keyConfig.type === EValueType.Image) {
          const temp = input.input[key]
          if (Array.isArray(temp) && temp.length === 0) {
            throw new Error(`Value of ${key} is empty`)
          }
        }
      }

      const tasks = convertObjectToArrayOfObjects(input.input)

      const isBatch = (input.repeat && input.repeat > 1) || tasks.length > 1

      // 5 minutes bias [0 -> 2] weight add on, eirly job will have lower weight -> more priority
      const timeWeight = (Date.now() % 300000) / 150000
      // Weight calculation
      const computedWeight = timeWeight + workflow.baseWeight + ctx.session.user!.weightOffset

      // Cost calculation
      let computedCost = workflow.cost
      for (const [key, config] of Object.entries(workflow.mapInput!)) {
        const value = input.input[key] ?? config.default
        if (config.cost?.related) {
          computedCost += config.cost.costPerUnit * Number(value)
        }
      }
      computedCost *= input.repeat ?? 1
      computedCost *= tasks.length

      if (ctx.session.user!.balance !== -1 && computedCost > ctx.session.user!.balance) {
        throw new Error('Insufficient balance')
      }
      if (ctx.session.user!.balance !== -1) {
        ctx.session.user!.balance -= computedCost
        await CachingService.getInstance().set('USER_BALANCE', ctx.session.user!.id, ctx.session.user!.balance)
      }

      // Create Parent Task
      const trigger = ctx.em.create(
        Trigger,
        {
          type: ETriggerBy.User,
          user: ctx.session.user
        },
        { partial: true }
      )
      const parentTask = ctx.em.create(
        WorkflowTask,
        {
          id: v4(),
          workflow,
          repeatCount: input.repeat ?? 1,
          inputValues: input.input,
          trigger,
          status: isBatch ? ETaskStatus.Parent : ETaskStatus.Queuing,
          computedWeight,
          computedCost
        },
        {
          partial: true
        }
      )
      ctx.em.persist(trigger).persist(parentTask)
      if (!isBatch) {
        const taskEvent = ctx.em.create(
          WorkflowTaskEvent,
          {
            task: parentTask
          },
          { partial: true }
        )
        parentTask.events.add(taskEvent)
        ctx.em.persist(taskEvent)
      }

      const createTask = (inputValues = input.input, parent?: WorkflowTask, weightOffset = 0) => {
        const trigger = ctx.em.create(
          Trigger,
          {
            type: ETriggerBy.User,
            user: ctx.session.user
          },
          { partial: true }
        )
        const task = ctx.em.create(
          WorkflowTask,
          {
            id: v4(),
            workflow,
            status: ETaskStatus.Queuing,
            repeatCount: 1,
            inputValues,
            trigger,
            parent,
            computedWeight: computedWeight + weightOffset,
            computedCost
          },
          {
            partial: true
          }
        )
        const taskEvent = ctx.em.create(
          WorkflowTaskEvent,
          {
            task
          },
          { partial: true }
        )
        task.events.add(taskEvent)
        ctx.em.persist(trigger).persist(task).persist(taskEvent)
        return task
      }

      if (isBatch) {
        let newSeed = 0
        const seedConf = Object.values(workflow.mapInput ?? {}).find((v) => v.type === EValueUtilityType.Seed)
        const repeat = input.repeat ?? 1
        for (let i = 0; i < repeat; i++) {
          for (const task of tasks) {
            if (!seedConf) {
              createTask(task, parentTask)
              continue
            }
            if (newSeed === 0) {
              newSeed = Math.floor(Number(task[seedConf.key!] ?? 1))
            }
            const newInput = {
              ...task,
              [seedConf?.key!]: ++newSeed
            }
            await delay(10)
            // 0.1 weight add on for each repeat
            const offsetWeight = i / 10
            createTask(newInput, parentTask, offsetWeight)
          }
        }
      }
      await Promise.all([
        ctx.em.flush(),
        CachingService.getInstance().set('LAST_TASK_CLIENT', -1, Date.now()),
        CachingService.getInstance().set('WORKFLOW', workflow.id, Date.now()),
        CachingService.getInstance().set('HISTORY_LIST', ctx.session.user!.id, Date.now())
      ])
      return true
    }),
  getRunning: privateProcedure
    .input(
      z.object({
        workflowId: z.string().optional()
      })
    )
    .query(async ({ input, ctx }) => {
      const query = input.workflowId ? { workflow: { id: input.workflowId } } : {}
      const triggerQuery =
        ctx.session.user!.role === EUserRole.Admin
          ? {}
          : {
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
              }
            }
      return ctx.em.find(
        WorkflowTask,
        {
          ...query,
          ...triggerQuery,
          status: {
            $nin: [ETaskStatus.Failed, ETaskStatus.Parent]
          },
          outputValues: null,
          attachments: null,
          executionTime: null
        },
        {
          orderBy: {
            createdAt: 'DESC'
          }
        }
      )
    })
})
