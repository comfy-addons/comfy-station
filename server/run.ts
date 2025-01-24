import { IncomingMessage, ServerResponse } from 'http'
import AttachmentService from '@/server/services/attachment'
import CachingService from '@/server/services/caching'
import { ComfyPoolInstance } from '@/server/services/comfyui'
import { MikroORMInstance } from '@/server/services/mikro-orm'
import { ElysiaHandler } from './elysia'
import { appRouter } from './routers/_app'
import { createContext } from './context'
import { UserManagement } from '@/server/services/user'
import { CleanupService } from '@/server/services/cleanup'
import { createBunWSHandler } from 'trpc-bun-adapter'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'

/**
 * Initialize all services
 */
MikroORMInstance.getInstance()
ComfyPoolInstance.getInstance()
AttachmentService.getInstance()
CachingService.getInstance()
UserManagement.getInstance()
/**
 * Start cleanup after 5 seconds
 */
setTimeout(() => {
  CleanupService.getInstance().handleCleanupClientEvents()
}, 5000)

const handleStaticFile = async (req: IncomingMessage, res: ServerResponse) => {
  if (!req.url) {
    res.writeHead(404)
    res.end()
    return
  }
  // Return files in storage/attachments folder
  const fileName = req.url.split('/attachments/')[1]
  // Convert encoded URI to normal string
  const decodedFileName = decodeURIComponent(fileName)
  const fileBlob = await AttachmentService.getInstance().getFileBlob(decodedFileName)
  if (fileBlob) {
    res.writeHead(200, {
      'Content-Type': fileBlob.type,
      'Content-Length': fileBlob.size
    })
    const buffer = await fileBlob.arrayBuffer()
    res.end(Buffer.from(buffer))
  } else {
    res.writeHead(404)
    res.end('File not found')
  }
}

const websocket = createBunWSHandler({
  router: appRouter,
  createContext,
  onError: () => {
    return true
  },
  batching: {
    enabled: true
  },
  keepAlive: {
    enabled: true,
    pingMs: 15000,
    pongWaitMs: 5000
  }
})

Bun.serve({
  async fetch(req, server) {
    const url = new URL(req.url, 'http://localhost:3001')
    const pathName = url.pathname
    const clientOrigin = req.headers.get('origin') || 'http://localhost:3000'
    if (pathName.startsWith('/ws')) {
      // Queries have auth
      if (!url.searchParams.get('auth')) {
        // auth required
        return new Response('UNAUTHORIZED', { status: 401 })
      }
      if (server.upgrade(req, { data: { req: req } })) {
        return
      }
    }
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': clientOrigin,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, trpc-accept',
          'Access-Control-Allow-Credentials': 'true'
        }
      })
    }
    if (pathName.startsWith('/attachments')) {
      const fileName = req.url.split('/attachments/')[1]
      const decodedFileName = decodeURIComponent(fileName)
      const fileBlob = await AttachmentService.getInstance().getFileBlob(decodedFileName)
      return new Response(fileBlob)
    }
    if (pathName.startsWith('/swagger') || pathName.startsWith('/api/user') || pathName.startsWith('/api/ext')) {
      const output = await ElysiaHandler.handle(req)
      if (output.status !== 404) {
        return output
      }
    }
    return fetchRequestHandler({
      endpoint: '/api/trpc',
      req: req,
      router: appRouter,
      createContext: createContext as any,
      responseMeta: () => ({
        headers: {
          'Access-Control-Allow-Origin': clientOrigin,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, trpc-accept',
          'Access-Control-Allow-Credentials': 'true'
        }
      })
    })
  },
  websocket,
  port: 3001
})
