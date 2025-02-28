import Elysia, { NotFoundError, t } from 'elysia'
import {
  ETaskStatus,
  ETriggerBy,
  EUserRole,
  EValueType,
  EValueUtilityType,
  EWorkflowActiveStatus
} from '@/entities/enum'
import { EnsureTokenPlugin } from '../plugins/ensure-token-plugin'
import { WorkflowInputSchema, WorkflowOutputSchema } from '../schemas/workflow'
import { EnsureMikroORMPlugin } from '../plugins/ensure-mikro-orm.plugin'
import { convertObjectToArrayOfObjects, delay, seed } from '@/utils/tools'
import { WorkflowTask } from '@/entities/workflow_task'
import { v4 } from 'uuid'
import { WorkflowTaskEvent } from '@/entities/workflow_task_event'
import { Trigger } from '@/entities/trigger'
import { Workflow } from '@/entities/workflow'
import { repeat } from 'lodash'
import CachingService from '@/server/services/caching'
import { isValidWorkflow } from '@/utils/workflow'

export const WorkflowPlugin = new Elysia({ prefix: '/workflow', detail: { tags: ['Workflow'] } })
  .use(EnsureMikroORMPlugin)
  .use(EnsureTokenPlugin)
  .get(
    '/list',
    async ({ em, token }) => {
      let workflows = token!.grantedWorkflows.map((wf) => wf.workflow)
      if (token.isMaster) {
        workflows = await em.find(Workflow, {
          status: EWorkflowActiveStatus.Activated
        })
      }
      return workflows
        .filter((v) => v.status === EWorkflowActiveStatus.Activated)
        .map((wf) => ({
          id: wf.id,
          name: wf.name,
          cost: wf.cost,
          input: Object.keys(wf.mapInput ?? {}).reduce(
            (acc, cur) => {
              const val = wf.mapInput![cur]
              acc[cur] = {
                key: val.key,
                type: val.type as EValueType,
                description: val.description,
                default: val.default,
                options: val.selections?.map((v) => v.value)
              }
              return acc
            },
            {} as Record<
              string,
              { key: string; type: EValueType; description?: string; default: any; options?: string[] }
            >
          ),
          output: Object.values(wf.mapOutput ?? {}).reduce(
            (acc, cur) => {
              acc[cur.key] = {
                type: cur.type as EValueType,
                description: cur.description
              }
              return acc
            },
            {} as Record<string, { type: EValueType; description?: string }>
          ),
          description: wf.description,
          createdAt: wf.createdAt.toISOString(),
          updatedAt: wf.updateAt.toISOString()
        }))
    },
    {
      detail: {
        description: 'Return list of granted workflows',
        responses: {
          200: {
            description: 'List of workflows',
            content: {
              'application/json': {
                schema: t.Array(
                  t.Object({
                    id: t.String({ description: 'Workflow ID', default: 'xxx-xxx-xxxxxx' }),
                    name: t.String({ description: 'Workflow name', default: 'Workflow Name' }),
                    cost: t.Number({ description: 'Workflow cost', default: 0 }) as any,
                    input: WorkflowInputSchema,
                    output: WorkflowOutputSchema,
                    description: t.String({ description: 'Workflow description', default: 'Workflow Description' }),
                    createdAt: t.String({
                      description: 'Workflow created at',
                      default: '2021-01-01T00:00:00.000Z'
                    }),
                    updatedAt: t.String({ description: 'Workflow updated at', default: '2021-01-01T00:00:00.000Z' })
                  })
                )
              }
            }
          }
        }
      }
    }
  )
  .post(
    '/raw/execute',
    async ({ token, em, body: { raw }, set }) => {
      const rawWf = typeof raw === 'string' ? JSON.parse(raw) : raw

      if (!token.isMaster) {
        set.status = 403
        throw new Error('Only master token can execute raw workflow')
      }
      if (!isValidWorkflow(rawWf)) {
        set.status = 400
        throw new Error('Invalid workflow format')
      }
      const user = token.createdBy

      // Return if this raw workflow already exists
      const preCheckWf = await em.findOne(Workflow, { rawWorkflow: JSON.stringify(rawWf) }, { populate: ['tasks'] })
      if (preCheckWf) {
        const taskItems = await preCheckWf.tasks.loadItems()
        const firstTask = taskItems.at(0)
        if (firstTask) {
          return {
            taskId: firstTask.id,
            cost: firstTask.computedCost,
            repeatCount: firstTask.repeatCount,
            cached: true
          }
        }
      }

      const workflow = em.create(
        Workflow,
        {
          id: v4(),
          rawWorkflow: JSON.stringify(rawWf),
          name: `raw-api-${Date.now()}`,
          author: user,
          hideWorkflow: true,
          baseWeight: 1,
          status: EWorkflowActiveStatus.Deleted // Executed one
        },
        { partial: true }
      )
      em.persist(workflow)

      // 5 minutes bias [0 -> 2] weight add on, eirly job will have lower weight -> more priority
      const timeWeight = (Date.now() % 300000) / 150000
      // Weight calculation
      const computedWeight = timeWeight + workflow.baseWeight + token.weightOffset
      // Cost calculation
      const computedCost = 0

      if (token.balance !== -1) {
        if (computedCost > token.balance) {
          set.status = 402
          throw new Error(`Insufficient balance, token's balance: ${token.balance}, task cost: ${computedCost}`)
        } else {
          token.balance -= computedCost
          await em.flush()
        }
      } else {
        // Using owned balance
        if (token.createdBy.role !== EUserRole.Admin) {
          if (token.createdBy.balance !== -1) {
            if (computedCost > token.createdBy.balance) {
              set.status = 402
              throw new Error(
                `Insufficient balance, user's balance: ${token.createdBy.balance}, task cost: ${computedCost}`
              )
            } else {
              token.createdBy.balance -= computedCost
              await Promise.all([
                em.flush(),
                CachingService.getInstance().set('USER_BALANCE', token.createdBy.id, token.createdBy.balance)
              ])
            }
          }
        }
      }

      // Create Parent Task
      const trigger = em.create(
        Trigger,
        {
          type: ETriggerBy.Token,
          token
        },
        { partial: true }
      )
      em.persist(trigger)

      const executeTask = em.create(
        WorkflowTask,
        {
          id: v4(),
          workflow,
          trigger,
          repeatCount: 1,
          inputValues: {},
          status: ETaskStatus.Queuing,
          computedWeight,
          computedCost
        },
        {
          partial: true
        }
      )
      em.persist(executeTask)
      const taskEvent = em.create(
        WorkflowTaskEvent,
        {
          task: executeTask
        },
        { partial: true }
      )
      executeTask.events.add(taskEvent)
      em.persist(taskEvent)
      await Promise.all([
        em.flush(),
        CachingService.getInstance().set('LAST_TASK_CLIENT', -1, Date.now()),
        CachingService.getInstance().set('WORKFLOW', executeTask.id, Date.now()),
        CachingService.getInstance().set('HISTORY_LIST', token.createdBy.id, Date.now())
      ])
      return {
        taskId: executeTask.id,
        cost: computedCost,
        repeatCount: repeat,
        cached: false
      }
    },
    {
      body: t.Object({
        raw: t.Union([t.String(), t.Record(t.String(), t.Any())], {
          description: 'Raw workflow in API Format'
        })
      }),
      detail: {
        responses: {
          200: {
            description: 'Task created',
            content: {
              'application/json': {
                schema: t.Object({
                  taskId: t.String({ description: 'Task ID', default: 'xxx-xxx-xxxxxx' }),
                  cost: t.Number({ description: 'Task cost', default: 0 }),
                  repeatCount: t.Number({ description: 'Repeat count', default: 1 }),
                  cached: t.Boolean({ description: 'Is this task is cached and return instantly', default: false })
                })
              } as any
            }
          },
          400: {
            description: 'Invalid input',
            content: {
              'application/json': {
                schema: t.Object({
                  error: t.String({ description: 'Error message' })
                })
              }
            }
          },
          402: {
            description: 'Insufficient balance',
            content: {
              'application/json': {
                schema: t.Object({
                  error: t.String({ description: 'Error message', default: 'Insufficient balance' })
                })
              }
            }
          },
          404: {
            description: 'Workflow not found',
            content: {
              'application/json': {
                schema: t.Object({
                  error: t.String({ description: 'Error message', default: 'Workflow not found' })
                })
              }
            }
          },
          500: {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: t.Object({
                  error: t.String({ description: 'Error message', default: 'Internal server error' })
                })
              }
            }
          }
        }
      }
    }
  )
  .post(
    '/:id/execute',
    async ({ token, em, params: { id }, body: { input, repeat = 1 }, set }) => {
      let workflow = token!.grantedWorkflows.find((wf) => wf.workflow.id === id)?.workflow

      if (token.isMaster) {
        workflow = (await em.findOne(Workflow, { id })) ?? undefined
      }

      if (!workflow) {
        throw new NotFoundError('Workflow not found')
      }

      for (const key in input) {
        const keyConfig = workflow.mapInput?.[key]
        if (!keyConfig) continue
        if (keyConfig.type === EValueType.Number) {
          const temp = Number(input[key])
          if (keyConfig.min && temp < keyConfig.min) {
            set.status = 400
            throw new Error(`Value of <${key}> is less than min value (min ${keyConfig.min})`)
          }
          if (keyConfig.max && temp > keyConfig.max) {
            set.status = 400
            throw new Error(`Value of <${key}> is greater than max value (max ${keyConfig.max})`)
          }
        }
        if (
          keyConfig.type === EValueType.File ||
          keyConfig.type === EValueType.Image ||
          keyConfig.type === EValueType.Video
        ) {
          const temp = input[key]
          if (Array.isArray(temp) && temp.length === 0) {
            set.status = 400
            throw new Error(`Value of "${key}" is empty`)
          }
        }
        if (keyConfig.type === EValueUtilityType.Seed && input[key] === -1) {
          input[key] = seed()
        }
      }

      const tasks = convertObjectToArrayOfObjects(input)
      const isBatch = repeat > 1 || tasks.length > 1

      // 5 minutes bias [0 -> 2] weight add on, eirly job will have lower weight -> more priority
      const timeWeight = (Date.now() % 300000) / 150000
      // Weight calculation
      const computedWeight = timeWeight + workflow.baseWeight + token.weightOffset

      // Cost calculation
      let computedCost = workflow.cost
      for (const [key, config] of Object.entries(workflow.mapInput!)) {
        const value = input[key] ?? config.default
        if (config.cost?.related) {
          computedCost += config.cost.costPerUnit * Number(value)
        }
      }
      computedCost *= repeat ?? 1
      computedCost *= tasks.length

      if (token.balance !== -1) {
        if (computedCost > token.balance) {
          set.status = 402
          throw new Error(`Insufficient balance, token's balance: ${token.balance}, task cost: ${computedCost}`)
        } else {
          token.balance -= computedCost
          await em.flush()
        }
      } else {
        // Using owned balance
        if (token.createdBy.role !== EUserRole.Admin) {
          if (token.createdBy.balance !== -1) {
            if (computedCost > token.createdBy.balance) {
              set.status = 402
              throw new Error(
                `Insufficient balance, user's balance: ${token.createdBy.balance}, task cost: ${computedCost}`
              )
            } else {
              token.createdBy.balance -= computedCost
              await Promise.all([
                em.flush(),
                CachingService.getInstance().set('USER_BALANCE', token.createdBy.id, token.createdBy.balance)
              ])
            }
          }
        }
      }

      // Create Parent Task
      const trigger = em.create(
        Trigger,
        {
          type: ETriggerBy.Token,
          token
        },
        { partial: true }
      )

      const parentTask = em.create(
        WorkflowTask,
        {
          id: v4(),
          workflow,
          repeatCount: repeat,
          inputValues: input,
          trigger,
          status: isBatch ? ETaskStatus.Parent : ETaskStatus.Queuing,
          computedWeight,
          computedCost
        },
        {
          partial: true
        }
      )
      em.persist(trigger).persist(parentTask)
      if (!isBatch) {
        const taskEvent = em.create(
          WorkflowTaskEvent,
          {
            task: parentTask
          },
          { partial: true }
        )
        parentTask.events.add(taskEvent)
        em.persist(taskEvent)
      }

      const createTask = (inputValues = input, parent?: WorkflowTask, weightOffset = 0) => {
        const trigger = em.create(
          Trigger,
          {
            type: ETriggerBy.Token,
            token
          },
          { partial: true }
        )
        const task = em.create(
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
        const taskEvent = em.create(
          WorkflowTaskEvent,
          {
            task
          },
          { partial: true }
        )
        task.events.add(taskEvent)
        em.persist(trigger).persist(task).persist(taskEvent)
        return task
      }

      if (isBatch) {
        let newSeed = 0
        const seedConf = Object.values(workflow.mapInput ?? {}).find((v) => v.type === EValueUtilityType.Seed)
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
        em.flush(),
        CachingService.getInstance().set('LAST_TASK_CLIENT', -1, Date.now()),
        CachingService.getInstance().set('WORKFLOW', parentTask.id, Date.now()),
        CachingService.getInstance().set('HISTORY_LIST', token.createdBy.id, Date.now())
      ])
      return {
        taskId: parentTask.id,
        cost: computedCost,
        repeatCount: repeat
      }
    },
    {
      body: t.Object({
        repeat: t.Optional(t.Number({ description: 'Repeat times', default: 1 })),
        input: t.Record(t.String(), t.Union([t.Optional(t.String()), t.Number(), t.Array(t.String())]), {
          default: {
            Caption: 'A picture of cute cat',
            Seed: 123123
          }
        })
      }),
      detail: {
        responses: {
          200: {
            description: 'Task created',
            content: {
              'application/json': {
                schema: t.Object({
                  taskId: t.String({ description: 'Task ID', default: 'xxx-xxx-xxxxxx' }),
                  cost: t.Number({ description: 'Task cost', default: 0 }),
                  repeatCount: t.Number({ description: 'Repeat count', default: 1 })
                })
              } as any
            }
          },
          400: {
            description: 'Invalid input',
            content: {
              'application/json': {
                schema: t.Object({
                  error: t.String({ description: 'Error message' })
                })
              }
            }
          },
          402: {
            description: 'Insufficient balance',
            content: {
              'application/json': {
                schema: t.Object({
                  error: t.String({ description: 'Error message', default: 'Insufficient balance' })
                })
              }
            }
          },
          404: {
            description: 'Workflow not found',
            content: {
              'application/json': {
                schema: t.Object({
                  error: t.String({ description: 'Error message', default: 'Workflow not found' })
                })
              }
            }
          },
          500: {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: t.Object({
                  error: t.String({ description: 'Error message', default: 'Internal server error' })
                })
              }
            }
          }
        }
      }
    }
  )
