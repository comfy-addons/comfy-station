import { Client } from '@/entities/client'
import { EAuthMode } from '@/entities/enum'
import { MikroORMInstance } from '@services/mikro-orm.service'
import { ComfyApi } from '@saintno/comfyui-sdk'
import { defineCommand } from 'citty'
import consola from 'consola'

export default defineCommand({
  meta: {
    name: 'client',
    description: 'Create or update comfyui client'
  },
  args: {
    host: {
      type: 'positional',
      description: 'host of client',
      required: false,
      alias: 'h'
    },
    password: {
      type: 'string',
      description: 'password of client, specify to update',
      required: false,
      alias: 'p'
    },
    username: {
      type: 'string',
      description: 'username of client, specify to update',
      required: false,
      alias: 'u'
    },
    delete: {
      type: 'boolean',
      description: 'delete client',
      required: false,
      alias: 'd'
    }
  },
  async run({ args }) {
    const db = await MikroORMInstance.getInstance().getEM()
    if (!args.host) {
      const clients = await db.find(Client, {}, { populate: ['password'] })
      consola.info('List of available clients:')
      clients.forEach((client) => {
        consola.info(`- ${client.host}`)
      })
      process.exit(0)
    }
    if (args.delete) {
      const client = await db.findOne(Client, { host: args.host })
      if (!client) {
        consola.error('Client not found')
        process.exit(0)
      }
      client.actionEvents.removeAll()
      client.monitorEvents.removeAll()
      client.statusEvents.removeAll()
      client.extensions.removeAll()
      await db.remove(client).flush()
      consola.success('Client removed')
      process.exit(0)
    }
    const client = await db.findOne(Client, { host: args.host })
    if (!client) {
      const apiOpts: any = {}
      if (args.username && args.password) {
        apiOpts.credentials = {
          type: 'basic',
          username: args.username,
          password: args.password
        }
      }
      const api = new ComfyApi(args.host, 'test', apiOpts)

      const ping = await api.ping()
      if (!ping.status || !('time' in ping)) {
        consola.error('Client not reachable')
        process.exit(0)
      }
      const newClient = new Client(args.host)
      if (args.username && args.password) {
        newClient.auth = EAuthMode.Basic
        newClient.username = args.username
        newClient.password = args.password
      }
      await db.persistAndFlush(newClient)
      consola.success(`Client ${newClient.host} created, ping: ${ping.time}`)
    } else {
      let updated = false
      if (args.password) {
        client.password = args.password
        updated = true
      }
      if (args.username) {
        client.username = args.username
        updated = true
      }
      if (updated) {
        await db.persistAndFlush(client)
        consola.success(`Client ${client.host} updated`)
      }
    }
    process.exit(0)
  }
})
