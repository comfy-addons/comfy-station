import { adminProcedure, editorProcedure, privateProcedure } from '../procedure'
import { router } from '../trpc'
import { z } from 'zod'
import { IMapperOutput, Workflow } from '@/entities/workflow'
import { EventEmitter, on } from 'node:events'
import { observable } from '@trpc/server/observable'
import { ComfyPoolInstance } from '@/server/services/comfyui'
import { CallWrapper } from '@saintno/comfyui-sdk'
import { cloneDeep, isEqual, uniqueId } from 'lodash'
import AttachmentService, { EAttachmentType } from '@/server/services/attachment'
import {
  EUserRole,
  EValueSelectionType,
  EValueType,
  EValueUtilityType,
  EWorkflowActiveStatus,
  EWorkflowEditType
} from '@/entities/enum'
import { Attachment } from '@/entities/attachment'
import { TWorkflowProgressMessage } from '@/types/task'
import { ImageUtil } from '../utils/ImageUtil'
import { WorkflowEditEvent } from '@/entities/workflow_edit_event'
import { getBuilder, parseOutput } from '@/utils/workflow'

const ee = new EventEmitter()

const emitAction = (id: string, data: TWorkflowProgressMessage) => {
  ee.emit(`workflow:${id}`, data)
}

const BaseSchema = z.object({
  key: z.string(),
  type: z.union([z.nativeEnum(EValueType), z.nativeEnum(EValueSelectionType), z.nativeEnum(EValueUtilityType)]),
  iconName: z.string().optional(),
  description: z.string().optional()
})

const TargetSchema = z.object({
  nodeName: z.string(),
  keyName: z.string(),
  mapVal: z.string()
})

const InputSchema = z.record(
  z.string(),
  z
    .object({
      target: z.array(TargetSchema),
      min: z.number().optional(),
      max: z.number().optional(),
      slider: z
        .object({
          enable: z.boolean(),
          step: z.number().optional()
        })
        .optional(),
      cost: z
        .object({
          related: z.boolean(),
          costPerUnit: z.number()
        })
        .optional(),
      selections: z
        .array(
          z.object({
            id: z.string().optional(),
            value: z.string()
          })
        )
        .optional(),
      generative: z
        .object({
          enabled: z.boolean(),
          instruction: z.string().optional()
        })
        .optional(),
      hidden: z.boolean().optional(),
      default: z.any().optional()
    })
    .and(BaseSchema)
)

const OutputSchema = z.record(
  z.string(),
  z
    .object({
      target: TargetSchema,
      joinArray: z.boolean().optional()
    })
    .and(BaseSchema)
)

export const workflowRouter = router({
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

      const filter =
        ctx.session.user!.role > EUserRole.User
          ? {
              status: {
                $ne: EWorkflowActiveStatus.Deleted
              }
            }
          : { status: EWorkflowActiveStatus.Activated }

      const data = await ctx.em.findByCursor(
        Workflow,
        filter,
        direction === 'forward'
          ? {
              exclude: ['rawWorkflow'],
              first: limit,
              after: { endCursor: cursor || null },
              orderBy: [
                { status: 'ASC' }, // Active status comes first (Activated = 0, Deactivated = 1, Deleted = 2)
                { createdAt: 'DESC' }
              ],
              populate: ['author', 'avatar']
            }
          : {
              exclude: ['rawWorkflow'],
              last: limit,
              before: { startCursor: cursor || null },
              orderBy: [{ status: 'ASC' }, { createdAt: 'DESC' }],
              populate: ['author', 'avatar']
            }
      )
      return {
        items: data.items,
        nextCursor: data.endCursor
      }
    }),
  listPicking: privateProcedure.query(async ({ ctx }) => {
    const data = await ctx.em.find(
      Workflow,
      {
        status: EWorkflowActiveStatus.Activated
      },
      {
        populate: ['avatar'],
        fields: ['id', 'name', 'description', 'status']
      }
    )
    return data
  }),
  attachments: privateProcedure
    .input(
      z.object({
        workflowId: z.string().optional(),
        search: z.string().optional(),
        limit: z.number().min(1).max(100).nullish(),
        cursor: z.string().nullish(),
        direction: z.enum(['forward', 'backward'])
      })
    )
    .query(async ({ input, ctx }) => {
      const workflow = input.workflowId
        ? {
            workflow: await ctx.em.findOneOrFail(Workflow, { id: input.workflowId })
          }
        : {
            workflow: {
              status: {
                $ne: EWorkflowActiveStatus.Deleted
              }
            }
          }
      const limit = input.limit ?? 50
      const { cursor, direction } = input

      const filter =
        ctx.session.user!.role === EUserRole.Admin // Only admin can see all images
          ? {}
          : {
              task: {
                trigger: {
                  $or: [
                    {
                      user: ctx.session.user
                    },
                    {
                      token: {
                        createdBy: ctx.session.user
                      }
                    }
                  ]
                }
              }
            }

      const data = await ctx.em.findByCursor(
        Attachment,
        {
          ...workflow,
          ...filter
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
  listWorkflowSelections: privateProcedure.query(async ({ ctx }) => {
    const filter =
      ctx.session.user!.role > EUserRole.User
        ? { status: { $ne: EWorkflowActiveStatus.Deleted } }
        : { status: EWorkflowActiveStatus.Activated }
    const data = await ctx.em.find(Workflow, filter, {
      fields: ['id', 'name', 'description', 'status']
    })
    return data
  }),
  get: privateProcedure.input(z.string()).query(async ({ input, ctx }) => {
    const filter =
      ctx.session.user!.role > EUserRole.User
        ? {}
        : {
            status: {
              $in: [EWorkflowActiveStatus.Activated, EWorkflowActiveStatus.Deactivated]
            }
          }
    return ctx.em.findOneOrFail(
      Workflow,
      {
        id: input,
        ...filter
      },
      { populate: ['author.email', 'avatar'], exclude: ['rawWorkflow'] }
    )
  }),
  detailed: editorProcedure.input(z.string()).query(async ({ input, ctx }) => {
    return ctx.em.findOneOrFail(
      Workflow,
      {
        id: input
      },
      { populate: ['author.email', 'avatar', 'rawWorkflow'] }
    )
  }),
  getRawWorkflow: editorProcedure.input(z.string()).mutation(async ({ input, ctx }) => {
    const workflow = await ctx.em.findOneOrFail(Workflow, { id: input }, { populate: ['rawWorkflow'] })
    const raw = JSON.parse(workflow.rawWorkflow)
    for (const key in raw) {
      delete raw[key as keyof typeof raw].info
    }
    return JSON.stringify(raw)
  }),
  changeStatus: editorProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.nativeEnum(EWorkflowActiveStatus)
      })
    )
    .mutation(async ({ input, ctx }) => {
      const workflow = await ctx.em.findOneOrFail(Workflow, { id: input.id })
      workflow.status = input.status
      await ctx.em.flush()
      return true
    }),
  testWorkflow: editorProcedure.input(z.string()).subscription(async function* ({ ctx, input, signal }) {
    for await (const [ev] of on(ee, `workflow:${input}`, {
      // Passing the AbortSignal from the request automatically cancels the event emitter when the request is aborted
      signal: signal
    })) {
      const data = ev as TWorkflowProgressMessage
      yield data
    }
  }),
  startTestWorkflow: editorProcedure
    .input(
      z.object({
        id: z.string(),
        input: z.record(z.string(), z.any()),
        workflow: z.any()
      })
    )
    .mutation(async ({ input, ctx }) => {
      const data = input
      const builder = getBuilder(data.workflow)
      const pool = ComfyPoolInstance.getInstance().pool
      emitAction(input.id, { key: 'init' })
      pool.run(async (api) => {
        for (const key in data.input) {
          const inputData = data.input[key] || data.workflow.mapInput?.[key].default
          if (!inputData) {
            continue
          }
          switch (data.workflow.mapInput?.[key].type) {
            case EValueType.Number:
            case EValueUtilityType.Seed:
              builder.input(key, Number(inputData))
              break
            case EValueType.String:
              builder.input(key, String(inputData))
              break
            case EValueType.File:
            case EValueType.Video:
            case EValueType.Image:
              const file = inputData as Attachment
              const fileBlob = await AttachmentService.getInstance().getFileBlob(file.fileName)
              if (!fileBlob) {
                emitAction(input.id, { key: 'failed', detail: 'missing file' })
                return
              }
              const uploadedImg = await api.uploadImage(fileBlob, file.fileName)
              if (!uploadedImg) {
                emitAction(input.id, { key: 'failed', detail: 'failed to upload file' })
                return
              }
              builder.input(key, uploadedImg.info.filename)
              break
            default:
              builder.input(key, inputData)
              break
          }
        }
        return new CallWrapper(api, builder)
          .onPending(() => {
            emitAction(input.id, { key: 'loading' })
          })
          .onProgress((e) => {
            emitAction(input.id, {
              key: 'progress',
              data: { node: Number(e.node), max: Number(e.max), value: Number(e.value) }
            })
          })
          .onPreview(async (e) => {
            const arrayBuffer = await e.arrayBuffer()
            const base64String = Buffer.from(arrayBuffer).toString('base64')
            emitAction(input.id, { key: 'preview', data: { blob64: base64String } })
          })
          .onStart(() => {
            emitAction(input.id, { key: 'start' })
          })
          .onFinished(async (outData) => {
            emitAction(input.id, { key: 'downloading_output' })
            const attachment = AttachmentService.getInstance()
            const output = await parseOutput(api, data.workflow, outData)
            emitAction(input.id, { key: 'uploading_output' })
            const tmpOutput = cloneDeep(output) as Record<string, any>
            // If key is array of Blob, convert it to base64
            for (const key in tmpOutput) {
              if (Array.isArray(tmpOutput[key])) {
                tmpOutput[key] = (await Promise.all(
                  tmpOutput[key].map(async (v, idx) => {
                    if (v instanceof Blob) {
                      const imgUtil = new ImageUtil(Buffer.from(await v.arrayBuffer()))
                      const jpg = await imgUtil.intoJPG()
                      const tmpName = `${uniqueId()}_${key}_${idx}.jpg`
                      const uploaded = await attachment.uploadFile(jpg, `${tmpName}`)
                      if (uploaded) {
                        return await attachment.getFileURL(tmpName, undefined, ctx.baseUrl)
                      }
                    }
                    return v
                  })
                )) as string[]
              }
            }
            const outputConfig = data.workflow.mapOutput
            const outputData = Object.keys(outputConfig || {}).reduce(
              (acc, val) => {
                if (tmpOutput[val] && outputConfig?.[val]) {
                  acc[val] = {
                    info: outputConfig[val],
                    data: tmpOutput[val]
                  }
                }
                return acc
              },
              {} as Record<
                string,
                {
                  info: IMapperOutput
                  data: number | boolean | string | Array<{ type: EAttachmentType; url: string }>
                }
              >
            )
            emitAction(input.id, { key: 'finished', data: { output: outputData } })
          })
          .onFailed((e) => {
            console.warn(e)
            emitAction(input.id, { key: 'failed', detail: (e.cause as any)?.error?.message || e.message })
          })
          .run()
      })
      return true
    }),
  importWorkflow: editorProcedure
    .input(
      z.object({
        name: z.string().optional(),
        description: z.string().optional(),
        rawWorkflow: z.string(),
        hideWorkflow: z.boolean().default(false).optional(),
        allowLocalhost: z.boolean().default(false).optional(),
        mapInput: InputSchema.optional(),
        mapOutput: OutputSchema.optional(),
        cost: z.number().default(0).optional(),
        baseWeight: z.number().default(0).optional(),
        status: z.nativeEnum(EWorkflowActiveStatus).default(EWorkflowActiveStatus.Activated).optional()
      })
    )
    .mutation(async ({ input, ctx }) => {
      const workflow = ctx.em.create(
        Workflow,
        {
          ...input
        },
        { partial: true }
      )
      const action = ctx.em.create(WorkflowEditEvent, { workflow, user: ctx.session.user! }, { partial: true })
      workflow.author = ctx.session.user!
      workflow.editedActions.add(action)
      await ctx.em.persist(action).persist(workflow).flush()
      return workflow
    }),
  updateWorkflow: editorProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        rawWorkflow: z.string().optional(),
        hideWorkflow: z.boolean().optional(),
        allowLocalhost: z.boolean().optional(),
        mapInput: InputSchema.optional(),
        mapOutput: OutputSchema.optional(),
        cost: z.number().optional(),
        baseWeight: z.number().optional(),
        status: z.nativeEnum(EWorkflowActiveStatus).optional()
      })
    )
    .mutation(async ({ input, ctx }) => {
      const workflow = await ctx.em.findOneOrFail(Workflow, { id: input.id }, { populate: ['rawWorkflow'] })

      // Compare the difference between the input and the current workflow
      const diff: { [key: string]: { key: string; from: any; to: any } } = {}
      for (const key in input) {
        if (key === 'id') {
          continue
        }
        const keyInput = (input as any)[key]
        const workflowVal = (workflow as any)[key]
        if (!isEqual(workflowVal, keyInput)) {
          diff[key] = { key, from: JSON.stringify(workflowVal), to: JSON.stringify(keyInput) }
        }
      }

      const action = ctx.em.create(
        WorkflowEditEvent,
        { workflow, user: ctx.session.user!, type: EWorkflowEditType.Update, info: diff },
        { partial: true }
      )
      workflow.editedActions.add(action)
      ctx.em.assign(workflow, input)
      await ctx.em.persist(action).flush()
      return workflow
    }),
  setAvatar: editorProcedure
    .input(z.object({ workflowId: z.string(), attachmentId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const workflow = await ctx.em.findOneOrFail(Workflow, { id: input.workflowId })
      const attachment = await ctx.em.findOneOrFail(Attachment, { id: input.attachmentId })
      workflow.avatar = attachment
      await ctx.em.persist(workflow).flush()
    }),
  duplicate: editorProcedure.input(z.string()).mutation(async ({ input, ctx }) => {
    // Find original workflow
    const originalWorkflow = await ctx.em.findOneOrFail(Workflow, { id: input }, { populate: ['rawWorkflow'] })

    // Create new workflow with copied data
    const duplicatedWorkflow = ctx.em.create(
      Workflow,
      {
        name: `${originalWorkflow.name} (Copy)`,
        description: originalWorkflow.description,
        rawWorkflow: originalWorkflow.rawWorkflow,
        hideWorkflow: originalWorkflow.hideWorkflow,
        allowLocalhost: originalWorkflow.allowLocalhost,
        mapInput: originalWorkflow.mapInput,
        mapOutput: originalWorkflow.mapOutput,
        cost: originalWorkflow.cost,
        baseWeight: originalWorkflow.baseWeight,
        status: EWorkflowActiveStatus.Deactivated, // Start as Deactivated
        author: ctx.session.user!
      },
      { partial: true }
    )

    // Create edit event
    const action = ctx.em.create(
      WorkflowEditEvent,
      {
        workflow: duplicatedWorkflow,
        user: ctx.session.user!,
        type: EWorkflowEditType.Create,
        info: { duplicatedFrom: originalWorkflow.id }
      },
      { partial: true }
    )

    duplicatedWorkflow.editedActions.add(action)

    await ctx.em.persistAndFlush([duplicatedWorkflow, action])
    return duplicatedWorkflow
  })
})
