import { adminProcedure, editorProcedure, privateProcedure } from '../procedure'
import { router } from '../trpc'
import { z } from 'zod'
import { IMapperOutput, Workflow } from '@/entities/workflow'
import { EventEmitter } from 'node:events'
import { observable } from '@trpc/server/observable'
import { ComfyPoolInstance } from '@/services/comfyui'
import { CallWrapper } from '@saintno/comfyui-sdk'
import { cloneDeep, uniqueId } from 'lodash'
import AttachmentService, { EAttachmentType } from '@/services/attachment'
import { EValueSelectionType, EValueType, EWorkflowActiveStatus } from '@/entities/enum'
import { Attachment } from '@/entities/attachment'
import { TWorkflowProgressMessage } from '@/types/task'
import { ImageUtil } from '../utils/ImageUtil'
import { WorkflowEditEvent } from '@/entities/workflow_edit_event'
import { getBuilder, parseOutput } from '@/utils/workflow'

const ee = new EventEmitter()

const BaseSchema = z.object({
  key: z.string(),
  type: z.union([z.nativeEnum(EValueType), z.nativeEnum(EValueSelectionType)]),
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

      const data = await ctx.em.findByCursor(
        Workflow,
        {},
        direction === 'forward'
          ? {
              first: limit,
              after: { endCursor: cursor || null },
              orderBy: { createdAt: 'DESC' },
              populate: ['author']
            }
          : {
              last: limit,
              before: { startCursor: cursor || null },
              orderBy: { createdAt: 'DESC' },
              populate: ['author']
            }
      )
      let nextCursor: typeof cursor | undefined = undefined
      if (data.items.length > limit) {
        const nextItem = data.items.pop()
        nextCursor = nextItem!.id
      }
      return {
        items: data.items,
        nextCursor
      }
    }),
  listWorkflowSelections: privateProcedure.query(async ({ ctx }) => {
    const data = await ctx.em.find(
      Workflow,
      {},
      {
        fields: ['id', 'name', 'description']
      }
    )
    return data
  }),
  get: privateProcedure.input(z.string()).query(async ({ input, ctx }) => {
    return ctx.em.findOneOrFail(Workflow, { id: input }, { populate: ['author.email'] })
  }),
  delete: editorProcedure.input(z.string()).mutation(async ({ input, ctx }) => {
    const workflow = await ctx.em.findOneOrFail(Workflow, { id: input })
    await ctx.em.removeAndFlush(workflow)
    return true
  }),
  testWorkflow: editorProcedure.subscription(async ({ input, ctx }) => {
    return observable<TWorkflowProgressMessage>((subscriber) => {
      const handle = (data: { input: Record<string, any>; workflow: Workflow }) => {
        subscriber.next({ key: 'init' })
        const builder = getBuilder(data.workflow)
        const pool = ComfyPoolInstance.getInstance().pool
        pool.run(async (api) => {
          for (const key in data.input) {
            const inputData = data.input[key] || data.workflow.mapInput?.[key].default
            if (!inputData) {
              continue
            }
            switch (data.workflow.mapInput?.[key].type) {
              case EValueType.Number:
              case EValueType.Seed:
                builder.input(key, Number(inputData))
                break
              case EValueType.String:
                builder.input(key, String(inputData))
                break
              case EValueType.File:
              case EValueType.Image:
                const file = inputData as Attachment
                const fileBlob = await AttachmentService.getInstance().getFileBlob(file.fileName)
                if (!fileBlob) {
                  return subscriber.next({ key: 'failed', detail: 'missing image' })
                }
                const uploadedImg = await api.uploadImage(fileBlob, file.fileName)
                if (!uploadedImg) {
                  subscriber.next({ key: 'failed', detail: 'failed to upload image' })
                  return
                }
                console.log('Uploaded image', uploadedImg)
                builder.input(key, uploadedImg.info.filename)
                break
              default:
                builder.input(key, inputData)
                break
            }
          }
          return new CallWrapper(api, builder)
            .onPending(() => {
              subscriber.next({ key: 'loading' })
            })
            .onProgress((e) => {
              subscriber.next({
                key: 'progress',
                data: { node: Number(e.node), max: Number(e.max), value: Number(e.value) }
              })
            })
            .onPreview(async (e) => {
              const arrayBuffer = await e.arrayBuffer()
              const base64String = Buffer.from(arrayBuffer).toString('base64')
              subscriber.next({ key: 'preview', data: { blob64: base64String } })
            })
            .onStart(() => {
              subscriber.next({ key: 'start' })
            })
            .onFinished(async (outData) => {
              subscriber.next({ key: 'downloading_output' })
              const attachment = AttachmentService.getInstance()
              const output = await parseOutput(api, data.workflow, outData)
              subscriber.next({ key: 'uploading_output' })
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
                          return await attachment.getFileURL(tmpName)
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
              subscriber.next({ key: 'finished', data: { output: outputData } })
            })
            .onFailed((e) => {
              console.log('WTF', e)
              subscriber.next({ key: 'failed', detail: (e.cause as any)?.error?.message || e.message })
            })
            .run()
        })
      }
      ee.on('start', handle)
      return () => {
        ee.off('start', handle)
      }
    })
  }),
  startTestWorkflow: editorProcedure
    .input(
      z.object({
        input: z.record(z.string(), z.any()),
        workflow: z.any()
      })
    )
    .mutation(async ({ input, ctx }) => {
      ee.emit('start', input)
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
    })
})
