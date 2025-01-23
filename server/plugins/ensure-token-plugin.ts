import { Token } from '@/entities/token'
import Elysia, { t } from 'elysia'
import { EnsureMikroORMPlugin } from './ensure-mikro-orm.plugin'

export const EnsureTokenPlugin = new Elysia()
  .guard({
    headers: t.Object({
      authorization: t.TemplateLiteral('Bearer ${string}', { default: 'Bearer XXXX-XXXX-XXXX-XXXX' })
    })
  })
  .use(EnsureMikroORMPlugin)
  .resolve({ as: 'scoped' }, async ({ headers: { authorization }, set, em }) => {
    if (!authorization) {
      set.status = 401
      throw new Error('Unauthorized')
    }
    const bearerToken = authorization.split(' ')[1]
    const token = await em!.findOne(Token, { id: bearerToken }, { populate: ['grantedWorkflows.*', 'createdBy'] })

    if (token?.expireAt && token.expireAt < new Date()) {
      set.status = 401
      throw new Error('Token expired')
    }

    if (!token) {
      set.status = 401
      throw new Error('Unauthorized')
    }
    return {
      token
    }
  })
