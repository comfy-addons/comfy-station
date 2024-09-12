import { z } from 'zod'
import { adminProcedure } from '../procedure'
import { router } from '../trpc'
import { Client } from '@/entities/client'
import { ComfyPoolInstance } from '@/services/comfyui'
import { observable } from '@trpc/server/observable'
import { ComfyApi, TMonitorEvent } from '@saintno/comfyui-sdk'
import { EAuthMode, EClientAction, EClientStatus, EResourceType, ETriggerBy } from '@/entities/enum'
import { ClientStatusEvent } from '@/entities/client_status_event'
import { ClientActionEvent } from '@/entities/client_action_event'
import { Trigger } from '@/entities/trigger'
import CachingService from '@/services/caching'
import { Resource } from '@/entities/client_resource'
import { Extension } from '@/entities/client_extension'
import { EImportingClient } from '@/constants/enum'

const cacher = CachingService.getInstance()

const ClientSchema = z.object({
  host: z.string(),
  auth: z.boolean().default(false).optional(),
  username: z.string().optional(),
  password: z.string().optional()
})

export const clientRouter = router({
  list: adminProcedure.query(async ({ ctx }) => {
    return ctx.em.find(Client, {})
  }),
  monitorSystem: adminProcedure.input(z.string()).subscription(async ({ input, ctx }) => {
    return observable<TMonitorEvent>((subscriber) => {
      const off = cacher.on('SYSTEM_MONITOR', input, (ev) => {
        subscriber.next(ev.detail)
      })
      return off
    })
  }),
  monitorStatus: adminProcedure.input(z.string()).subscription(async ({ input, ctx }) => {
    const latestEvent = await ctx.em.findOne(
      ClientStatusEvent,
      {
        client: {
          id: input
        }
      },
      { populate: ['client'], orderBy: { createdAt: 'DESC' } }
    )
    if (!latestEvent) {
      throw new Error('Client not found')
    }
    return observable<EClientStatus>((subscriber) => {
      subscriber.next(latestEvent.status)
      const off = cacher.on('CLIENT_STATUS', input, (ev) => {
        subscriber.next(ev.detail)
      })
      return off
    })
  }),
  control: adminProcedure
    .input(
      z.object({
        clientId: z.string(),
        mode: z.enum(['FREE_VRAM', 'REBOOT', 'INTERRUPT'])
      })
    )
    .mutation(async ({ input, ctx }) => {
      const pool = ComfyPoolInstance.getInstance().pool
      const client = await ctx.em.findOne(Client, { id: input.clientId })
      if (!ctx.session?.user) {
        throw new Error('User not found in session')
      }
      if (!client) {
        throw new Error('Client not found in db')
      }
      const trigger = ctx.em.create(Trigger, {
        type: ETriggerBy.User,
        user: ctx.session.user,
        createdAt: new Date()
      })
      const action = ctx.em.create(ClientActionEvent, {
        client,
        trigger,
        createdAt: new Date()
      })

      const clientCtl = pool.pickById(input.clientId)
      if (!clientCtl) {
        throw new Error('Client not found')
      }
      try {
        switch (input.mode) {
          case 'FREE_VRAM':
            action.action = EClientAction.FREE_MEMORY
            await clientCtl.freeMemory(true, true)
            break
          case 'REBOOT':
            action.action = EClientAction.RESTART
            if (!clientCtl.ext.manager.isSupported) {
              throw new Error('Client not supported')
            }
            await clientCtl.ext.manager.rebootInstance()
            break
          case 'INTERRUPT':
            action.action = EClientAction.INTERRUPT
            await clientCtl.interrupt()
            break
        }
        await ctx.em.persistAndFlush(action)
        return true
      } catch (e) {
        console.error(e)
        return false
      }
    }),
  overview: adminProcedure.subscription(async ({ ctx }) => {
    const cacher = CachingService.getInstance()
    const clients = await ctx.em.find(Client, {})

    const getStatues = async () => {
      const data = await Promise.all(clients.map((client) => cacher.get('CLIENT_STATUS', client.id)))
      return {
        online: data.filter((e) => !!e && [EClientStatus.Online, EClientStatus.Executing].includes(e)).length,
        offline: data.filter((e) => !!e && e === EClientStatus.Offline).length,
        error: data.filter((e) => !!e && e === EClientStatus.Error).length
      }
    }

    return observable<Awaited<ReturnType<typeof getStatues>>>((subscriber) => {
      getStatues().then((data) => subscriber.next(data))
      const off = cacher.onCategory('CLIENT_STATUS', async (ev) => {
        getStatues().then((data) => subscriber.next(data))
      })
      return off
    })
  }),
  testNewClient: adminProcedure.input(ClientSchema).mutation(async ({ input, ctx }) => {
    if (input.auth && (!input.username || !input.password)) {
      throw new Error('Username or password is required')
    }
    const existed = await ctx.em.findOne(Client, { host: input.host })
    if (existed) {
      throw new Error('Client already exists')
    }
    const api = new ComfyApi(input.host, 'test', {
      credentials: input.auth ? { type: 'basic', username: input.username!, password: input.password! } : undefined
    })
    const test = await api.ping()
    if ('time' in test) {
      await api.init().waitForReady()
      return {
        ping: test.time,
        feature: {
          manager: api.ext.manager.isSupported,
          monitor: api.ext.monitor.isSupported
        }
      }
    } else {
      throw new Error('Client not reachable')
    }
  }),
  getResourcesNewClient: adminProcedure.input(ClientSchema).query(async ({ input, ctx }) => {
    if (input.auth && (!input.username || !input.password)) {
      throw new Error('Username or password is required')
    }
    const api = new ComfyApi(input.host, 'test', {
      credentials: input.auth ? { type: 'basic', username: input.username!, password: input.password! } : undefined
    })
    const [checkpoints, lora, samplerInfo] = await Promise.all([
      api.getCheckpoints(),
      api.getLoras(),
      api.getSamplerInfo()
    ])
    const extensions = await api.getNodeDefs()
    const nodes = Object.values(extensions ?? {})
    // Group by python_module
    const grouped = nodes.reduce(
      (acc, node) => {
        if (!acc[node.python_module]) {
          acc[node.python_module] = []
        }
        acc[node.python_module].push(node)
        return acc
      },
      {} as Record<string, typeof nodes>
    )
    return {
      checkpoints,
      lora,
      samplerInfo,
      extensions: grouped
    }
  }),
  addNewClient: adminProcedure
    .input(z.intersection(ClientSchema, z.object({ displayName: z.string().optional() })))
    .subscription(async ({ input, ctx }) => {
      if (input.auth && (!input.username || !input.password)) {
        throw new Error('Username or password is required')
      }
      const api = new ComfyApi(input.host, 'test', {
        credentials: input.auth ? { type: 'basic', username: input.username!, password: input.password! } : undefined
      })
      return observable<EImportingClient>((subscriber) => {
        const run = async () => {
          const test = await api.ping()
          if (test.status) {
            subscriber.next(EImportingClient.PING_OK)
          } else {
            subscriber.next(EImportingClient.FAILED)
            return
          }
          let client = await ctx.em.findOne(Client, { host: input.host })
          if (!client) {
            client = ctx.em.create(Client, {
              host: input.host,
              auth: input.auth ? EAuthMode.Basic : EAuthMode.None,
              username: input.username,
              password: input.password,
              name: input.displayName ?? input.host
            })
            await ctx.em.persistAndFlush(client)
          }
          subscriber.next(EImportingClient.CLIENT_CREATED)

          const importCkpt = async () => {
            const ckpts = await api.getCheckpoints()
            for (const ckpt of ckpts) {
              let resource = await ctx.em.findOne(Resource, { name: ckpt, type: EResourceType.Checkpoint })
              if (!resource) {
                resource = ctx.em.create(
                  Resource,
                  {
                    name: ckpt,
                    type: EResourceType.Checkpoint
                  },
                  { partial: true }
                )
              }
              client.resources.add(resource)
            }
            await ctx.em.persistAndFlush(client)
            subscriber.next(EImportingClient.IMPORTED_CHECKPOINT)
          }
          const importLora = async () => {
            const loras = await api.getLoras()
            for (const lora of loras) {
              let resource = await ctx.em.findOne(Resource, { name: lora, type: EResourceType.Lora })
              if (!resource) {
                resource = ctx.em.create(
                  Resource,
                  {
                    name: lora,
                    type: EResourceType.Lora
                  },
                  { partial: true }
                )
              }
              client.resources.add(resource)
            }
            await ctx.em.persistAndFlush(client)
            subscriber.next(EImportingClient.IMPORTED_LORA)
          }
          const importSamplerScheduler = async () => {
            const samplerInfo = await api.getSamplerInfo()
            const samplers = samplerInfo.sampler[0] as string[]
            const schedulers = samplerInfo.scheduler[0] as string[]
            for (const sampler of samplers) {
              let resource = await ctx.em.findOne(Resource, { name: sampler, type: EResourceType.Sampler })
              if (!resource) {
                resource = ctx.em.create(
                  Resource,
                  {
                    name: sampler,
                    type: EResourceType.Sampler
                  },
                  { partial: true }
                )
              }
              client.resources.add(resource)
            }
            for (const scheduler of schedulers) {
              let resource = await ctx.em.findOne(Resource, { name: scheduler, type: EResourceType.Scheduler })
              if (!resource) {
                resource = ctx.em.create(
                  Resource,
                  {
                    name: scheduler,
                    type: EResourceType.Scheduler
                  },
                  { partial: true }
                )
              }
              client.resources.add(resource)
            }
            await ctx.em.persistAndFlush(client)
            subscriber.next(EImportingClient.IMPORTED_SAMPLER_SCHEDULER)
          }
          const importExtension = async () => {
            const extensions = (await api.getNodeDefs()) ?? []
            for (const ext of Object.values(extensions)) {
              let resource = await ctx.em.findOne(Extension, { pythonModule: ext.python_module, name: ext.name })
              if (!resource) {
                resource = ctx.em.create(
                  Extension,
                  {
                    name: ext.name,
                    displayName: ext.display_name,
                    pythonModule: ext.python_module,
                    category: ext.category,
                    outputNode: ext.output_node,
                    inputConf: ext.input.required,
                    description: ext.description,
                    outputConf: ext.output?.map((o, idx) => ({
                      name: ext.output_name?.[idx] ?? '',
                      isList: ext.output_is_list?.[idx] ?? false,
                      type: o,
                      tooltip: ext.output_tooltips?.[idx] ?? ''
                    }))
                  },
                  { partial: true }
                )
              }
              client.extensions.add(resource)
            }
            await ctx.em.persistAndFlush(client)
            subscriber.next(EImportingClient.IMPORTED_EXTENSION)
          }
          await Promise.all([importCkpt(), importLora(), importSamplerScheduler(), importExtension()]).catch((e) => {
            console.error(e)
            subscriber.next(EImportingClient.FAILED)
          })
          subscriber.next(EImportingClient.DONE)
          ComfyPoolInstance.getInstance().pool.addClient(
            new ComfyApi(input.host, client.id, {
              credentials: input.auth
                ? { type: 'basic', username: input.username!, password: input.password! }
                : undefined
            })
          )
        }
        run()
      })
    })
})
