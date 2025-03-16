import Elysia from 'elysia'
import { EnsureBaseURL } from './ensure-baseurl-plugin'

export const EnsureCorsPlugin = new Elysia().use(EnsureBaseURL).resolve({ as: 'scoped' }, async ({ set, baseUrl }) => {
  set.headers['Access-Control-Allow-Origin'] = baseUrl || '*'
  set.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
  set.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, trpc-accept'
  set.headers['Access-Control-Allow-Credentials'] = 'true'
  return {}
})
