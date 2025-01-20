import Elysia, { t } from 'elysia'
import { EnsureMikroORMPlugin } from '../plugins/ensure-mikro-orm.plugin'
import { EnsureTokenPlugin } from '../plugins/ensure-token-plugin'
import { generateHeapSnapshot } from 'bun'
import { heapStats } from 'bun:jsc'
import { EnsureBaseURL } from '../plugins/ensure-baseurl-plugin'

export const SystemPlugin = new Elysia({ prefix: '/system', detail: { tags: ['System'] } })
  .use(EnsureMikroORMPlugin)
  .use(EnsureTokenPlugin)
  .use(EnsureBaseURL)
  .get(
    '/memory/stats',
    async ({ token }) => {
      if (!token.isMaster) {
        return { message: 'Only master tokens can access this endpoint' }
      }
      return heapStats()
    },
    {
      detail: {
        description: 'Get memory stats',
        responses: {
          200: {
            description: 'Memory stats',
            content: {
              'application/json': {
                schema: t.Object({
                  heapSize: t.Number(),
                  heapCapacity: t.Number(),
                  extraMemorySize: t.Number(),
                  objectCount: t.Number(),
                  protectedObjectCount: t.Number(),
                  globalObjectCount: t.Number(),
                  protectedGlobalObjectCount: t.Number(),
                  objectTypeCounts: t.Record(t.String(), t.Number()),
                  protectedObjectTypeCounts: t.Record(t.String(), t.Number())
                })
              }
            } as any
          }
        }
      }
    }
  )
  .post(
    '/memory/gc',
    async ({ token }) => {
      if (!token.isMaster) {
        return { message: 'Only master tokens can access this endpoint' }
      }
      Bun.gc(true)
      return { message: 'Garbage collection triggered' }
    },
    {
      detail: {
        description: 'Trigger garbage collection',
        responses: {
          200: {
            description: 'Garbage collection triggered',
            content: {
              'application/json': {
                schema: t.Object({
                  message: t.String()
                })
              }
            } as any
          }
        }
      }
    }
  )
  .get(
    '/memory/dump',
    async ({ token, set, baseUrl }) => {
      if (!token.isMaster) {
        set.status = 403
        return { message: 'Only master tokens can access this endpoint' }
      }
      const snapshot = generateHeapSnapshot()
      const snapshotID = `heap-${Date.now()}.json`
      await Bun.write(process.cwd() + `/storage/attachments/${snapshotID}`, JSON.stringify(snapshot, null, 2))
      return { snapshotID, url: `${baseUrl}/attachments/${snapshotID}` }
    },
    {
      detail: {
        description: 'Dump the current memory heap',
        responses: {
          200: {
            description: 'Heap snapshot ID',
            content: {
              'application/json': {
                schema: t.Object({
                  snapshotID: t.String(),
                  url: t.String()
                })
              }
            } as any
          }
        }
      }
    }
  )
