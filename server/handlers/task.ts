import Elysia, { NotFoundError, t } from 'elysia'
import { EnsureTokenPlugin } from '../plugins/ensure-token-plugin'
import { EnsureMikroORMPlugin } from '../plugins/ensure-mikro-orm.plugin'
import { WorkflowTask } from '@/entities/workflow_task'
import { WorkflowTaskEvent } from '@/entities/workflow_task_event'
import { TaskEventSchema, TaskSchema } from '../schemas/task'
import { ETaskStatus } from '@/entities/enum'
import { QueryOrder } from '@mikro-orm/core'
import { AttachmentSchema, AttachmentURLSchema } from '../schemas/attachment'
import { Attachment } from '@/entities/attachment'
import AttachmentService from '@/server/services/attachment'
import { EnsureBaseURL } from '../plugins/ensure-baseurl-plugin'

export const TaskPlugin = new Elysia({ prefix: '/task', detail: { tags: ['Task'] } })
  .use(EnsureMikroORMPlugin)
  .use(EnsureTokenPlugin)
  .use(EnsureBaseURL)
  .get(
    '/',
    async ({ token, em, query: { offset = 0, limit = 10 } }) => {
      const tasks = await em.find(
        WorkflowTask,
        { parent: null, trigger: { token } },
        {
          offset,
          limit,
          orderBy: {
            createdAt: QueryOrder.DESC
          }
        }
      )
      return {
        data: tasks,
        total: await em.count(WorkflowTask, { parent: null, trigger: { token } })
      }
    },
    {
      detail: {
        description: 'Get list of tasks by given token',
        responses: {
          200: {
            description: 'List of tasks',
            content: {
              'application/json': {
                schema: t.Object({
                  data: t.Array(TaskSchema),
                  total: t.Number()
                })
              } as any
            }
          }
        }
      },
      query: t.Object({
        offset: t.Optional(t.Number({ default: 0 })),
        limit: t.Optional(t.Number({ default: 10 }))
      })
    }
  )
  .get(
    '/:id',
    async ({ em, params: { id } }) => {
      const task = await em.findOne(WorkflowTask, { id }, { populate: ['attachments', 'subTasks.attachments'] })
      if (!task) {
        return new NotFoundError("Task doesn't exist")
      }
      const events = await em.find(WorkflowTaskEvent, { task })
      return {
        task,
        events
      }
    },
    {
      detail: {
        description: 'Get task details by given id',
        responses: {
          200: {
            description: 'Task details with events',
            content: {
              'application/json': {
                schema: t.Object({
                  task: TaskSchema,
                  events: t.Array(TaskEventSchema)
                })
              } as any
            }
          }
        }
      }
    }
  )
  .get(
    '/:id/status',
    async ({ em, params: { id } }) => {
      const task = await em.findOneOrFail(WorkflowTask, { id }, { populate: ['subTasks.*'] })
      let isDone = false
      if (task.status === ETaskStatus.Parent) {
        isDone = Array.from(task.subTasks).every((v) => v.executionTime !== null)
      } else {
        isDone = task.executionTime !== null
      }
      if (!task) {
        return new NotFoundError("Task doesn't exist")
      }
      return {
        isDone,
        status: task.status === ETaskStatus.Parent ? task.subTasks.map((v) => v.status) : task.status
      }
    },
    {
      detail: {
        description: 'Get task status by given id',
        responses: {
          200: {
            description: 'Task details with events',
            content: {
              'application/json': {
                schema: t.Object({
                  isDone: t.Boolean(),
                  status: t.Union([t.Array(t.Enum(ETaskStatus)), t.Enum(ETaskStatus)])
                })
              } as any
            }
          }
        }
      }
    }
  )
  .get(
    '/:id/result',
    async ({ em, params: { id } }) => {
      const task = await em.findOne(WorkflowTask, { id }, { populate: ['attachments', 'subTasks.attachments'] })
      if (!task) {
        return new NotFoundError("Task doesn't exist")
      }
      if (task.status === ETaskStatus.Parent) {
        return task.subTasks.map((v) => ({
          taskId: v.id,
          status: v.status,
          output: v.outputValues,
          attachments: Array.from(v.attachments)
        }))
      } else {
        return {
          taskId: task.id,
          status: task.status,
          output: task.outputValues,
          attachments: Array.from(task.attachments)
        }
      }
    },
    {
      detail: {
        description: 'Get task result by given id',
        responses: {
          200: {
            description: 'Result data',
            content: {
              'application/json': {
                schema: t.Union([
                  t.Object({
                    taskId: t.String(),
                    status: t.Enum(ETaskStatus),
                    output: t.Optional(t.Record(t.String(), t.Any())),
                    attachments: t.Array(AttachmentSchema)
                  }),
                  t.Array(
                    t.Object({
                      taskId: t.String(),
                      status: t.Enum(ETaskStatus),
                      output: t.Optional(t.Record(t.String(), t.Any())),
                      attachments: t.Array(AttachmentSchema)
                    })
                  )
                ])
              } as any
            }
          }
        }
      }
    }
  )
  .get(
    '/:id/attachments',
    async ({ em, params: { id }, baseUrl }) => {
      const task = await em.findOne(WorkflowTask, { id }, { populate: ['attachments', 'subTasks.attachments'] })
      if (!task) {
        return new NotFoundError("Task doesn't exist")
      }
      const attachments: Attachment[] = []
      if (task.status === ETaskStatus.Parent) {
        attachments.push(...task.subTasks.map((v) => Array.from(v.attachments)).flat())
      } else {
        attachments.push(...task.attachments)
      }
      return await Promise.all(
        attachments.map(async (attachment) => {
          const stockName = attachment.fileName
          const prevName = `${attachment.fileName}_preview.jpg`
          const highName = `${attachment.fileName}_high.jpg`
          const [stock, preview, high] = await Promise.all([
            AttachmentService.getInstance().getFileURL(stockName, undefined, baseUrl),
            AttachmentService.getInstance().getFileURL(prevName, undefined, baseUrl),
            AttachmentService.getInstance().getFileURL(highName, undefined, baseUrl)
          ])
          return {
            info: attachment,
            urls: {
              stock,
              preview,
              high
            }
          }
        })
      )
    },
    {
      detail: {
        description: 'Get task result by given id',
        responses: {
          200: {
            description: 'Result data',
            content: {
              'application/json': {
                schema: t.Array(
                  t.Object({
                    info: AttachmentSchema,
                    urls: t.Object({
                      stock: AttachmentURLSchema,
                      preview: AttachmentURLSchema,
                      high: AttachmentURLSchema
                    })
                  })
                )
              } as any
            }
          }
        }
      }
    }
  )
