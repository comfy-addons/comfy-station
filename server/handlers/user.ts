import { User } from '@/entities/user'
import { BackendENV } from '@/env'
import { MikroORMInstance } from '@/server/services/mikro-orm'
import Elysia, { t } from 'elysia'

const mikro = MikroORMInstance.getInstance()

export const UserPlugin = new Elysia({
  prefix: '/api/user',
  detail: {
    tags: ['Auth'],
    hide: true
  }
})
  .post(
    '/credential',
    async ({ body, headers, set }) => {
      const auth = headers.authorization
      if (!auth || auth !== `Bearer ${BackendENV.INTERNAL_SECRET}`) {
        set.status = 401
        return 'Unauthorized'
      }
      const { email, password } = body
      const em = await mikro.getEM()
      const user = await em.findOne(User, { email, password: User.hashPassword(password) }, { populate: ['avatar'] })
      if (!user) {
        set.status = 401
        return 'Unauthorized'
      }
      return JSON.stringify(user)
    },
    {
      headers: t.Object({
        authorization: t.TemplateLiteral('Bearer ${string}', { default: 'Bearer XXXX-XXXX-XXXX-XXXX' })
      }),
      body: t.Object({
        email: t.String(),
        password: t.String()
      }),
      detail: {
        responses: {
          200: {
            description: 'User details',
            content: {
              'application/json': {
                schema: t.Object({
                  id: t.String(),
                  email: t.String(),
                  avatar: t.Optional(t.String())
                })
              }
            }
          },
          401: {
            description: 'Unauthorized'
          }
        }
      }
    }
  )
  .post(
    '/email',
    async ({ headers, body, set }) => {
      const auth = headers.authorization
      if (!auth || auth !== `Bearer ${BackendENV.INTERNAL_SECRET}`) {
        set.status = 401
        return 'Unauthorized'
      }

      const { email } = body
      const em = await mikro.getEM()
      const user = await em.fork().findOne(User, { email }, { populate: ['avatar'] })
      if (!user) {
        set.status = 401
        return 'Unauthorized'
      }
      return JSON.stringify(user)
    },
    {
      headers: t.Object({
        authorization: t.TemplateLiteral('Bearer ${string}', { default: 'Bearer XXXX-XXXX-XXXX-XXXX' })
      }),
      body: t.Object({
        email: t.String()
      }),
      detail: {
        responses: {
          200: {
            description: 'User details',
            content: {
              'application/json': {
                schema: t.Object({
                  id: t.String(),
                  email: t.String(),
                  avatar: t.Optional(t.String())
                })
              }
            }
          },
          401: {
            description: 'Unauthorized'
          }
        }
      }
    }
  )
