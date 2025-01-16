import { MikroORMInstance } from '@services/mikro-orm.service'
import Elysia from 'elysia'

export const EnsureMikroORMPlugin = new Elysia().derive({ as: 'scoped' }, async () => {
  return {
    em: await MikroORMInstance.getInstance().getEM()
  }
})
