import { MikroORM } from '@mikro-orm/libsql'

import dbConfig from '@/mikro-orm.config'
import { Logger } from '@saintno/needed-tools'

export class MikroORMInstance {
  private orm: Promise<MikroORM>
  private logger: Logger

  private constructor() {
    this.logger = new Logger('MikroORMInstance')
    this.orm = MikroORM.init(dbConfig).then(async (orm) => {
      const generator = orm.getSchemaGenerator()
      await generator.updateSchema().catch((e) => {
        this.logger.i('init', 'Schema is updated', e)
      })
      this.logger.i('init', 'MikroORM initialized')
      return orm
    })
  }

  static getInstance() {
    if (!(global as any).__MikroORM__) {
      ;(global as any).__MikroORM__ = new MikroORMInstance()
    }
    return (global as any).__MikroORM__ as MikroORMInstance
  }

  async getORM() {
    return this.orm
  }

  async getEM() {
    const orm = await this.getORM()
    return orm.em.fork()
  }
}
