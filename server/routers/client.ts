import { z } from 'zod'
import { adminProcedure } from '../procedure'
import { router } from '../trpc'
import { Client } from '@/entities/client'
import { ComfyPoolInstance } from '@services/comfyui.service'
import { observable } from '@trpc/server/observable'
import { ComfyApi, TMonitorEvent } from '@saintno/comfyui-sdk'
import { EAuthMode, EClientAction, EClientStatus, EResourceType, ETriggerBy } from '@/entities/enum'
import { ClientStatusEvent } from '@/entities/client_status_event'
import { ClientActionEvent } from '@/entities/client_action_event'
import { Trigger } from '@/entities/trigger'
import CachingService from '@services/caching.service'
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
  delete: adminProcedure.input(z.string()).mutation(async ({ input, ctx }) => {
    const client = await ctx.em.findOne(Client, { host: input })
    if (!client) {
      throw new Error('Client not found')
    }
    const pool = ComfyPoolInstance.getInstance().pool
    const clientIns = pool.pickById(input)
    if (clientIns) {
      clientIns.destroy()
      pool.removeClient(clientIns)
    }
    client.actionEvents.removeAll()
    client.monitorEvents.removeAll()
    client.statusEvents.removeAll()
    client.extensions.removeAll()
    await ctx.em.remove(client).flush()
    await cacher.set('CLIENT_STATUS', input, EClientStatus.Offline)
    return true
  }),
  monitorSystem: adminProcedure.input(z.string()).subscription(async function* ({ input, signal }) {
    for await (const data of cacher.onGenerator('SYSTEM_MONITOR', input, signal)) {
      yield data.detail
    }
  }),
  monitorStatus: adminProcedure.input(z.string()).subscription(async function* ({ input, ctx, signal }) {
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
    } else {
      yield latestEvent.status
    }
    for await (const data of cacher.onGenerator('CLIENT_STATUS', input, signal)) {
      yield data.detail
    }
  }),
  control: adminProcedure
    .input(
      z.object({
        clientId: z.string(),
        mode: z.nativeEnum(EClientAction)
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
        action: input.mode,
        createdAt: new Date()
      })

      const clientCtl = pool.pickById(input.clientId)
      if (!clientCtl) {
        throw new Error('Client not found')
      }
      try {
        switch (input.mode) {
          case EClientAction.FREE_MEMORY:
            await clientCtl.freeMemory(true, true)
            break
          case EClientAction.RESTART:
            if (!clientCtl.ext.manager.isSupported) {
              throw new Error('Client not supported')
            }
            await clientCtl.ext.manager.rebootInstance()
            break
          case EClientAction.INTERRUPT:
            await clientCtl.interrupt()
            break
          case EClientAction.FORCE_RECONNECT:
            await clientCtl.reconnectWs(true)
            break
          default:
            throw new Error('Unknown action')
        }
        await ctx.em.persistAndFlush(action)
        return true
      } catch (e) {
        console.error(e)
        return false
      }
    }),
  overview: adminProcedure.subscription(async function* ({ ctx, signal }) {
    const cacher = CachingService.getInstance()

    const getStatues = async () => {
      const clients = await ctx.em.find(Client, {})
      const data = await Promise.all(clients.map((client) => cacher.get('CLIENT_STATUS', client.id)))
      return {
        online: data.filter((e) => !!e && [EClientStatus.Online, EClientStatus.Executing].includes(e)).length,
        offline: data.filter((e) => e === EClientStatus.Offline).length,
        error: data.filter((e) => e === EClientStatus.Error).length
      }
    }
    yield await getStatues()
    for await (const _ of cacher.onCategoryGenerator('CLIENT_STATUS', signal)) {
      yield await getStatues()
    }
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
    .subscription(async function* ({ input, ctx, signal }) {
      if (input.auth && (!input.username || !input.password)) {
        throw new Error('Username or password is required')
      }
      const api = new ComfyApi(input.host, 'test', {
        credentials: input.auth ? { type: 'basic', username: input.username!, password: input.password! } : undefined
      })

      const test = await api.ping()
      if (test.status) {
        yield EImportingClient.PING_OK
      } else {
        yield EImportingClient.FAILED
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
      yield EImportingClient.CLIENT_CREATED

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
        return EImportingClient.IMPORTED_CHECKPOINT
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
        return EImportingClient.IMPORTED_LORA
      }
      const importSamplerScheduler = async () => {
        const samplerInfo = await api.getSamplerInfo()
        const samplers = samplerInfo.sampler?.[0] as string[]
        const schedulers = samplerInfo.scheduler?.[0] as string[]
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
        return EImportingClient.IMPORTED_SAMPLER_SCHEDULER
      }
      const importExtension = async () => {
        const extensions = (await api.getNodeDefs()) ?? []
        const promises = Object.values(extensions).map(async (ext) => {
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
        })
        await Promise.all(promises)
        await ctx.em.persistAndFlush(client)
        return EImportingClient.IMPORTED_EXTENSION
      }
      try {
        for await (const status of [importCkpt(), importLora(), importSamplerScheduler(), importExtension()]) {
          yield status
        }
        yield EImportingClient.DONE
        ComfyPoolInstance.getInstance().pool.addClient(
          new ComfyApi(input.host, client.id, {
            credentials: input.auth
              ? { type: 'basic', username: input.username!, password: input.password! }
              : undefined
          })
        )
      } catch (e) {
        console.error(e)
        yield EImportingClient.FAILED
      }
    })
})
