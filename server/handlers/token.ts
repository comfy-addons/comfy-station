import Elysia, { t } from 'elysia'
import { EnsureMikroORMPlugin } from '../plugins/ensure-mikro-orm.plugin'
import { EnsureTokenPlugin } from '../plugins/ensure-token-plugin'
import { TokenInformationSchema } from '../schemas/token'

export const TokenPlugin = new Elysia({ prefix: '/token', detail: { tags: ['Others'] } })
  .use(EnsureMikroORMPlugin)
  .use(EnsureTokenPlugin)
  .get(
    '/',
    async ({ token }) => {
      return JSON.stringify({ ...token, grantedWorkflows: undefined })
    },
    {
      detail: {
        description: 'Get current token information',
        responses: {
          200: {
            description: 'Token information',
            content: {
              'application/json': {
                schema: TokenInformationSchema
              }
            } as any
          }
        }
      }
    }
  )
