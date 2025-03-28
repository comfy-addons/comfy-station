import {
  BasicCredentials,
  BearerTokenCredentials,
  CallWrapper,
  ComfyApi,
  ComfyPool,
  CustomCredentials,
  TMonitorEvent
} from '@saintno/comfyui-sdk'
import { Logger } from '@saintno/needed-tools'
import { MikroORMInstance } from './mikro-orm'
import { Client } from '@/entities/client'
import {
  EAttachmentStatus,
  EAuthMode,
  EClientStatus,
  ENotificationTarget,
  ENotificationType,
  EStorageType,
  ETaskStatus,
  EValueType,
  EValueUtilityType
} from '@/entities/enum'
import { ClientStatusEvent } from '@/entities/client_status_event'
import { ClientMonitorEvent } from '@/entities/client_monitor_event'
import { ClientMonitorGpu } from '@/entities/client_monitor_gpu'
import CachingService from './caching'

import { cloneDeep, throttle } from 'lodash'
import { WorkflowTask } from '@/entities/workflow_task'
import { WorkflowTaskEvent } from '@/entities/workflow_task_event'
import { getBuilder, parseOutput } from '@/utils/workflow'
import { Attachment } from '@/entities/attachment'
import AttachmentService, { EAttachmentType } from './attachment'
import { ImageUtil } from '@/server/utils/ImageUtil'
import { delay } from '@/utils/tools'
import { User } from '@/entities/user'
import { classifyBlob } from '@/server/utils/file'
import { Workflow } from '@/entities/workflow'
import mine from 'mime'

const MONITOR_INTERVAL = 5000

export class ComfyPoolInstance {
  public pool: ComfyPool
  private cachingService: CachingService
  private logger: Logger
  private updateTime: Record<string, number> = {} // ClientId -> Last update time

  static getInstance() {
    if (!(global as any).__ComfyPool__) {
      ;(global as any).__ComfyPool__ = new ComfyPoolInstance()
    }
    return (global as any).__ComfyPool__ as ComfyPoolInstance
  }

  private constructor() {
    this.cachingService = CachingService.getInstance()
    this.logger = new Logger('ComfyPoolInstance')
    this.pool = new ComfyPool([])
    this.bindEvents()
    this.initialize()
  }

  private async initialize() {
    const em = await MikroORMInstance.getInstance().getEM()
    const clients = await em.find(Client, {}, { populate: ['password'] })

    for (const clientConf of clients) {
      let credentials: BasicCredentials | BearerTokenCredentials | CustomCredentials | undefined = undefined
      switch (clientConf.auth) {
        case EAuthMode.Basic: {
          credentials = {
            type: 'basic',
            username: clientConf.username ?? '',
            password: clientConf.password ?? ''
          }
          break
        }
        case EAuthMode.Token: {
          credentials = {
            type: 'bearer_token',
            token: clientConf.password ?? ''
          }
          break
        }
        case EAuthMode.Custom: {
          credentials = {
            type: 'custom',
            headers: JSON.parse(clientConf.password ?? '{}')
          }
          break
        }
      }
      this.pool.addClient(
        new ComfyApi(clientConf.host, clientConf.id, {
          credentials,
          listenTerminal: true
        })
      )
    }
    this.cleanAllRunningTasks().then(() => delay(1000).then(() => this.pickingJob()))
  }

  private addClientMonitoring = async (clientId: string, data: TMonitorEvent) => {
    if (!this.updateTime[clientId]) {
      this.updateTime[clientId] = Date.now()
    }
    if (Date.now() - this.updateTime[clientId] < MONITOR_INTERVAL) return
    const em = await MikroORMInstance.getInstance().getEM()
    const client = await em.findOne(Client, { id: clientId })
    if (client) {
      const gpus: ClientMonitorGpu[] = []
      const monitorEv = new ClientMonitorEvent(client)
      monitorEv.cpuUsage = data.cpu_utilization
      monitorEv.memoryUsage = data.ram_used / 1024
      monitorEv.memoryTotal = Math.round((data.ram_used / 1024 / data.ram_used_percent) * 100)
      data.gpus.forEach((gpu, idx) => {
        const gpuEv = new ClientMonitorGpu(monitorEv, idx, Math.round(gpu.vram_used / 1024), Math.round(gpu.vram_total))
        gpuEv.temperature = gpu.gpu_temperature
        gpuEv.utilization = gpu.gpu_utilization
        gpus.push(gpuEv)
      })
      monitorEv.gpus.add(gpus)
      client.monitorEvents.add(monitorEv)
      await em.persist(monitorEv).flush()
    }
    em.clear()
    this.updateTime[clientId] = Date.now()
  }

  updateTaskEventFn = async (
    em: Awaited<ReturnType<Awaited<ReturnType<typeof MikroORMInstance.getInstance>['getEM']>>>,
    task: WorkflowTask,
    status: ETaskStatus,
    extra?: {
      clientId?: string
      details?: string
      data?: any
    }
  ) => {
    const taskEvent = new WorkflowTaskEvent(task)
    taskEvent.status = status
    if (extra?.details) {
      taskEvent.details = extra.details
    }
    if (extra?.data) {
      taskEvent.data = extra.data
    }
    task.events.add(taskEvent)
    task.status = status
    await Promise.all([
      em.persist(taskEvent).flush(),
      this.cachingService.set('LAST_TASK_CLIENT', extra?.clientId || -1, Date.now()),
      this.cachingService.set('HISTORY_ITEM', task.id || -1, Date.now())
    ])
    if (task.parent?.id) {
      this.cachingService.set('HISTORY_ITEM', task.parent.id, Date.now())
    }
    if ([ETaskStatus.Failed, ETaskStatus.Success, ETaskStatus.Pending].includes(status)) {
      if (status === ETaskStatus.Success && extra?.details !== 'FINISHED') return
      await this.cachingService.set('WORKFLOW', task.workflow.id, Date.now())
    }
  }

  private async cleanAllRunningTasks() {
    const em = await MikroORMInstance.getInstance().getEM()
    const processingTasks = await em.find(WorkflowTask, {
      status: {
        $in: [ETaskStatus.Pending, ETaskStatus.Running]
      }
    })
    for (const task of processingTasks) {
      task.status = ETaskStatus.Queuing
    }
    const processedTaskWithoutData = await em.find(WorkflowTask, {
      status: ETaskStatus.Success,
      attachments: null
    })
    em.remove(processedTaskWithoutData)
    await em.flush()
  }

  private handleImageOutput = async (
    imgBlob: Blob,
    info: {
      key: string
      idx: number
      task: WorkflowTask
      workflow: Workflow
    },
    attachment: AttachmentService,
    em: Awaited<ReturnType<Awaited<ReturnType<typeof MikroORMInstance.getInstance>['getEM']>>>
  ) => {
    const { key, idx, task, workflow } = info
    const imgUtil = new ImageUtil(Buffer.from(await imgBlob.arrayBuffer()))
    const [preview, high, raw] = await Promise.all([
      // For thumbnail
      imgUtil
        .clone()
        .resizeMax(1024)
        .intoPreviewJPG()
        .catch((e) => {
          this.logger.w('Error while converting to preview', e)
          return null
        }),
      // For on click into thumbnail preview
      imgUtil
        .clone()
        .intoHighJPG()
        .catch((e) => {
          this.logger.w('Error while converting to preview', e)
          return null
        }),
      // Raw image, use for download
      imgUtil.intoPNG()
    ])
    const tmpName = `${task.id}_${key}_${idx}.png`
    const [uploaded] = await Promise.all([
      attachment.uploadFile(raw, `${tmpName}`),
      preview ? attachment.uploadFile(preview, `${tmpName}_preview.jpg`) : Promise.resolve(false),
      high ? attachment.uploadFile(high, `${tmpName}_high.jpg`) : Promise.resolve(false)
    ])
    if (uploaded) {
      const fileInfo = await attachment.getFileURL(tmpName)
      const ratio = await imgUtil.getRatio()
      const outputAttachment = em.create(
        Attachment,
        {
          fileName: tmpName,
          size: raw.byteLength,
          storageType: fileInfo?.type === EAttachmentType.LOCAL ? EStorageType.LOCAL : EStorageType.S3,
          status: EAttachmentStatus.UPLOADED,
          ratio,
          task,
          workflow
        },
        { partial: true }
      )
      em.persist(outputAttachment)
      return outputAttachment.id
    }
  }

  private handleVideoOutput = async (
    videoBlob: Blob,
    info: {
      key: string
      idx: number
      task: WorkflowTask
      workflow: Workflow
    },
    attachment: AttachmentService,
    em: Awaited<ReturnType<Awaited<ReturnType<typeof MikroORMInstance.getInstance>['getEM']>>>
  ) => {
    const { key, idx, task, workflow } = info
    const buff = Buffer.from(await videoBlob.arrayBuffer())
    const extension = mine.getExtension(videoBlob.type) || 'mp4'
    const tmpName = `${task.id}_${key}_${idx}.${extension}`

    const uploaded = await attachment.uploadFile(buff, `${tmpName}`)
    if (uploaded) {
      const fileInfo = await attachment.getFileURL(tmpName)
      const outputAttachment = em.create(
        Attachment,
        {
          fileName: tmpName,
          size: buff.byteLength,
          type: EValueType.Video,
          storageType: fileInfo?.type === EAttachmentType.LOCAL ? EStorageType.LOCAL : EStorageType.S3,
          status: EAttachmentStatus.UPLOADED,
          task,
          workflow
        },
        { partial: true }
      )
      em.persist(outputAttachment)
      return outputAttachment.id
    }
  }

  private handleFileOutput = async (
    fileBlob: Blob,
    info: {
      key: string
      idx: number
      task: WorkflowTask
      workflow: Workflow
    },
    attachment: AttachmentService,
    em: Awaited<ReturnType<Awaited<ReturnType<typeof MikroORMInstance.getInstance>['getEM']>>>
  ) => {
    const { key, idx, task, workflow } = info
    const buff = Buffer.from(await fileBlob.arrayBuffer())
    const extension = mine.getExtension(fileBlob.type)
    const tmpName = extension ? `${task.id}_${key}_${idx}.${extension}` : `${task.id}_${key}_${idx}`

    const uploaded = await attachment.uploadFile(buff, `${tmpName}`)
    if (uploaded) {
      const fileInfo = await attachment.getFileURL(tmpName)
      const outputAttachment = em.create(
        Attachment,
        {
          fileName: tmpName,
          size: buff.byteLength,
          type: EValueType.File,
          storageType: fileInfo?.type === EAttachmentType.LOCAL ? EStorageType.LOCAL : EStorageType.S3,
          status: EAttachmentStatus.UPLOADED,
          task,
          workflow
        },
        { partial: true }
      )
      em.persist(outputAttachment)
      return outputAttachment.id
    }
  }

  private async pickingJob() {
    let tries = 1
    const pool = this.pool
    const emRaw = await MikroORMInstance.getInstance().getEM()
    while (true) {
      const em = emRaw.fork()
      const userRep = em.getRepository(User)
      const queuingTasks = await em.find(
        WorkflowTask,
        {
          status: ETaskStatus.Queuing
        },
        {
          limit: 10,
          populate: ['workflow', 'parent', 'trigger.user.weightOffset', 'workflow.rawWorkflow'],
          orderBy: { createdAt: 'ASC' }
        }
      )
      try {
        if (queuingTasks.length > 0) {
          tries = 0
          for (let i = 0; i < queuingTasks.length; i++) {
            const task = queuingTasks[i]
            const user = task.trigger?.user
            const workflow = task.workflow
            try {
              const input = task.inputValues
              let builder = getBuilder(workflow)
              await this.updateTaskEventFn(em, task, ETaskStatus.Pending)
              if (user) {
                this.cachingService.set('USER_EXECUTING_TASK', user.id, Date.now())
              }
              pool.run(async (api) => {
                if (api.ext.manager.isSupported) {
                  // Set preview method before execute
                  // TODO: Add setting for this
                  void api.ext.manager.previewMethod('latent2rgb').catch((e) => {
                    console.error(e)
                  })
                }
                const start = performance.now()
                try {
                  const client = await em.findOne(Client, { id: api.id })
                  if (client) {
                    task.client = client
                    await em.persist(task).flush()
                    await this.cachingService.set('LAST_TASK_CLIENT', api.id, Date.now())
                  }
                  for (const key in input) {
                    if (!workflow.mapInput?.[key]) {
                      this.logger.w('pickingJob', `Input key ${key} not found in workflow map`, {
                        key,
                        workflowId: workflow.id
                      })
                      continue
                    }
                    const inputData = input[key] || workflow.mapInput?.[key].default
                    if (!inputData) {
                      continue
                    }
                    switch (workflow.mapInput?.[key].type) {
                      case EValueType.Number:
                      case EValueUtilityType.Seed:
                        builder.input(key, Number(inputData))
                        break
                      case EValueUtilityType.Prefixer:
                        builder.input(key, task.id)
                        break
                      case EValueType.String:
                        builder.input(key, String(inputData))
                        break
                      case EValueType.File:
                      case EValueType.Video:
                      case EValueType.Image:
                        const attachmentId = inputData as string
                        const file = await em.findOneOrFail(Attachment, { id: attachmentId })
                        const fileBlob = await AttachmentService.getInstance().getFileBlob(file.fileName)
                        if (!fileBlob) {
                          await this.updateTaskEventFn(em, task, ETaskStatus.Failed, {
                            details: `Can not load attachments ${file.fileName}`,
                            clientId: api.id
                          })
                          await this.cachingService.set('LAST_TASK_CLIENT', api.id, Date.now())
                          return
                        }
                        const uploadedImg = await api.uploadImage(fileBlob, file.fileName)
                        if (!uploadedImg) {
                          await this.updateTaskEventFn(em, task, ETaskStatus.Failed, {
                            details: `Failed to upload attachment into comfy server, ${file.fileName}`,
                            clientId: api.id
                          })
                          await this.cachingService.set('LAST_TASK_CLIENT', api.id, Date.now())
                          return
                        }
                        builder.input(key, uploadedImg.info.filename)
                        break
                      default:
                        builder.input(key, inputData)
                        break
                    }
                  }
                  console.log(JSON.stringify(builder.workflow))
                  return new CallWrapper(api, builder)
                    .onPending(async () => {
                      await this.updateTaskEventFn(em, task, ETaskStatus.Running, {
                        details: 'LOADING RESOURCES',
                        clientId: api.id
                      })
                    })
                    .onProgress(async (e) => {
                      await this.updateTaskEventFn(em, task, ETaskStatus.Running, {
                        details: JSON.stringify({
                          key: 'progress',
                          data: { node: Number(e.node), max: Number(e.max), value: Number(e.value) }
                        }),
                        clientId: api.id
                      })
                    })
                    .onPreview(async (e) => {
                      const arrayBuffer = await e.arrayBuffer()
                      const base64String = Buffer.from(arrayBuffer).toString('base64')
                      await this.cachingService.set('PREVIEW', task.id, { blob64: base64String })
                    })
                    .onStart(async () => {
                      await this.updateTaskEventFn(em, task, ETaskStatus.Running, {
                        details: 'START RENDERING',
                        clientId: api.id
                      })
                    })
                    .onFinished((outData) => {
                      const backgroundFn = async () => {
                        await this.updateTaskEventFn(em, task, ETaskStatus.Success, {
                          details: 'DOWNLOADING OUTPUT',
                          clientId: api.id
                        })
                        const attachment = AttachmentService.getInstance()
                        const output = await parseOutput(api, workflow, outData)
                        await this.updateTaskEventFn(em, task, ETaskStatus.Success, {
                          details: 'UPLOADING OUTPUT',
                          clientId: api.id
                        })
                        const tmpOutput = cloneDeep(output) as Record<string, any>
                        // If key is array of Blob, convert it to base64
                        for (const key in tmpOutput) {
                          if (Array.isArray(tmpOutput[key])) {
                            tmpOutput[key] = (await Promise.all(
                              tmpOutput[key].map(async (v, idx) => {
                                if (v instanceof Blob) {
                                  // Check if v is Video, Image or others
                                  const blobType = classifyBlob(v)
                                  switch (blobType) {
                                    case EValueType.Image: {
                                      return await this.handleImageOutput(
                                        v,
                                        { key, idx, task, workflow },
                                        attachment,
                                        em
                                      )
                                    }
                                    case EValueType.Video: {
                                      return await this.handleVideoOutput(
                                        v,
                                        { key, idx, task, workflow },
                                        attachment,
                                        em
                                      )
                                    }
                                    default: {
                                      return await this.handleFileOutput(
                                        v,
                                        { key, idx, task, workflow },
                                        attachment,
                                        em
                                      )
                                    }
                                  }
                                }
                                return v
                              })
                            )) as string[]
                          }
                        }
                        const outputConfig = workflow.mapOutput
                        let outputData = Object.keys(outputConfig || {}).reduce(
                          (acc, val) => {
                            if (tmpOutput[val] && outputConfig?.[val]) {
                              acc[val] = {
                                type: outputConfig[val].type as EValueType,
                                value: tmpOutput[val] as any
                              }
                            }
                            return acc
                          },
                          {} as Record<
                            string,
                            {
                              type: EValueType
                              value: any
                            }
                          >
                        )
                        task.executionTime = performance.now() - start
                        task.outputValues = outputData
                        if (user) {
                          userRep.makeNotify(user, {
                            title: `Task is finished`,
                            type: ENotificationType.Info,
                            target: {
                              targetType: ENotificationTarget.WorkflowTask,
                              targetId: task.id
                            }
                          })
                          this.cachingService.set('USER_EXECUTING_TASK', user.id, Date.now())
                        }
                        await Promise.all([
                          em.flush(),
                          this.updateTaskEventFn(em, task, ETaskStatus.Success, {
                            details: 'FINISHED',
                            clientId: api.id,
                            data: outData
                          })
                        ])
                      }
                      const timeoutPromise = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Task execution timed out')), 60000)
                      )
                      Promise.race([backgroundFn(), timeoutPromise]).catch(async (e) => {
                        await this.updateTaskEventFn(em, task, ETaskStatus.Failed, {
                          details: (e.cause as any)?.error?.message || e.message,
                          clientId: api.id
                        })
                        console.error(e)
                      })
                    })
                    .onFailed(async (e) => {
                      if (user) {
                        userRep.makeNotify(user, {
                          title: `Task is failed`,
                          type: ENotificationType.Error,
                          priority: 2,
                          description: (e.cause as any)?.error?.message || e.message,
                          target: {
                            targetType: ENotificationTarget.WorkflowTask,
                            targetId: task.id
                          }
                        })
                        this.cachingService.set('USER_EXECUTING_TASK', user.id, Date.now())
                      }
                      await this.updateTaskEventFn(em, task, ETaskStatus.Failed, {
                        details: (e.cause as any)?.error?.message || e.message,
                        clientId: api.id
                      })
                      console.error(e)
                    })
                    .run()
                    .catch(async (e) => {
                      throw e
                    })
                } catch (e: any) {
                  if (user) {
                    userRep.makeNotify(user, {
                      title: `Task is failed`,
                      type: ENotificationType.Error,
                      description: (e.cause as any)?.error?.message || e?.message || "Can't execute task",
                      priority: 2,
                      target: {
                        targetType: ENotificationTarget.WorkflowTask,
                        targetId: task.id
                      }
                    })
                    this.cachingService.set('USER_EXECUTING_TASK', user.id, Date.now())
                  }
                  await this.updateTaskEventFn(em, task, ETaskStatus.Failed, {
                    details: (e.cause as any)?.error?.message || e?.message || "Can't execute task",
                    clientId: api.id
                  })
                  console.error(e)
                  return false
                }
              }, task.computedWeight)
            } catch (e) {
              console.error(e)
              await this.updateTaskEventFn(em, task, ETaskStatus.Failed, {
                details: `Can't execute task ${task.id}`
              })
            }
          }
          await this.cachingService.set('LAST_TASK_CLIENT', -1, Date.now())
          await em.flush()
        } else {
          if (tries < 100) tries++
        }
      } catch (e) {
        console.warn(e)
      } finally {
        em.clear()
      }
      await delay(tries * 10)
    }
  }

  async setClientStatus(clientId: string, status: EClientStatus, msg?: string) {
    const em = await MikroORMInstance.getInstance().getEM()
    const client = await em.findOne(Client, { id: clientId })
    if (client) {
      const statusEvent = new ClientStatusEvent(client, status)
      if (msg) {
        statusEvent.message = msg
      }
      client.statusEvents.add(statusEvent)
      await em.persist(statusEvent).flush()
      await this.cachingService.set('CLIENT_STATUS', client.id, status)
    }
    em.clear()
  }

  private bindEvents() {
    this.pool
      .on('init', async () => {
        this.logger.i('init', 'ComfyPool initialized')
        this.setClientStatus('all', EClientStatus.Offline)
      })
      .on('added', (ev) => {
        this.logger.i('added', `Add new client ${ev.detail.clientIdx}`, {
          id: ev.detail.client.id
        })
      })
      .on('connection_error', async (ev) => {
        this.logger.i('connection_error', 'Connection error', ev.detail.client.id)
        this.setClientStatus(ev.detail.client.id, EClientStatus.Error, 'Connection error')
      })
      .on('auth_error', async (ev) => {
        this.logger.i('auth_error', 'Authentication error', ev.detail.client.id)
        this.setClientStatus(ev.detail.client.id, EClientStatus.Error, 'Authentication error')
      })
      .on('have_job', async (ev) => {
        this.logger.i('have_job', 'Have job', ev.detail.client.id)
        this.setClientStatus(ev.detail.client.id, EClientStatus.Executing)
      })
      .on('terminal', async (ev) => {
        const clientId = this.pool.pick(ev.detail.clientIdx)?.id
        if (clientId) {
          this.cachingService.set('CLIENT_LOG', clientId, { m: ev.detail.m, t: ev.detail.t })
        }
      })
      .on('idle', async (ev) => {
        this.logger.i('idle', 'Idle', ev.detail.client.id)
        this.setClientStatus(ev.detail.client.id, EClientStatus.Online)
      })
      .on('connected', async (ev) => {
        this.logger.i('connected', `Client ${ev.detail.clientIdx} connected`, {
          id: ev.detail.client.id
        })
        this.setClientStatus(ev.detail.client.id, EClientStatus.Online)
      })
      .on('reconnected', async (ev) => {
        this.logger.i('reconnected', `Client ${ev.detail.clientIdx} reconnected`, {
          id: ev.detail.client.id
        })
        this.setClientStatus(ev.detail.client.id, EClientStatus.Online, 'Reconnected')
      })
      .on('disconnected', async (ev) => {
        this.logger.i('disconnected', `Client ${ev.detail.clientIdx} disconnected`, {
          id: ev.detail.client.id
        })
        this.setClientStatus(ev.detail.client.id, EClientStatus.Offline)
      })
      .on('executing', async (ev) => {
        this.logger.i('executing', `Client ${ev.detail.clientIdx} executing`, {
          id: ev.detail.client.id
        })
        this.setClientStatus(ev.detail.client.id, EClientStatus.Executing)
      })
      .on('executed', async (ev) => {
        this.logger.i('executed', `Client ${ev.detail.clientIdx} executed`, {
          id: ev.detail.client.id
        })
        this.setClientStatus(ev.detail.client.id, EClientStatus.Online)
      })
      .on('system_monitor', async (ev) => {
        const data = ev.detail.data
        const clientId = ev.detail.client.id
        await this.cachingService.set('SYSTEM_MONITOR', clientId, data)
        this.addClientMonitoring(clientId, data)
      })
      .on('execution_error', (error) => {})
  }
}
