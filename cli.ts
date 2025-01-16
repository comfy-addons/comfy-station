import { defineCommand, runMain } from 'citty'
import { MikroORMInstance } from '@services/mikro-orm.service'

const main = defineCommand({
  meta: {
    name: 'comfy-station',
    version: '1.0.0',
    description: 'CLI to manage the DB'
  },
  async setup() {
    await MikroORMInstance.getInstance().getORM()
  },
  subCommands: {
    user: () => import('./commands/user').then((r) => r.default),
    client: () => import('./commands/client').then((r) => r.default),
    token: () => import('./commands/token').then((r) => r.default)
  }
})

runMain(main)
