import { createServer, IncomingMessage, ServerResponse } from 'http'
import cors from 'cors'
import { WebSocketServer } from 'ws'
import type { Socket } from 'net'
import { applyWSSHandler } from '@trpc/server/adapters/ws'
import AttachmentService from '@services/attachment.service'
import CachingService from '@services/caching.service'
import { ComfyPoolInstance } from '@services/comfyui.service'
import { MikroORMInstance } from '@services/mikro-orm.service'
import { createHTTPHandler } from '@trpc/server/adapters/standalone'

import { convertIMessToRequest } from './utils/request'
import { ElysiaHandler } from './elysia'
import { appRouter } from './routers/_app'
import { createContext } from './context'
import { UserManagement } from '@services/user.service'
import { CleanupService } from '@services/cleanup.service'
import { createPrefixedHandler } from './utils/handler'

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

export const tRPCHandler = createHTTPHandler({
  middleware: cors(),
  router: appRouter,
  createContext: createContext as any
})
const prefixedTRPCHandler = createPrefixedHandler('/api/trpc', tRPCHandler)

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

const handleElysia = async (req: IncomingMessage, res: ServerResponse) => {
  const request = await convertIMessToRequest(req)
  const output = await ElysiaHandler.handle(request)
  // If the response is 404, then passthrough request to tRPC's handler
  if (output.status !== 404) {
    res.writeHead(output.status, {
      'Content-Type': output.headers.get('content-type') ?? 'application/json'
    })
    const contentType = output.headers.get('content-type') ?? 'application/json'
    res.writeHead(output.status, { 'Content-Type': contentType })

    if (contentType.startsWith('text/') || contentType === 'application/json') {
      const data = await output.text()
      res.write(data)
    } else {
      const data = await output.arrayBuffer()
      res.write(Buffer.from(data))
    }

    res.end()
    return true
  }
  return false
}

const server = createServer(async (req, res) => {
  try {
    if (req.url?.startsWith('/attachments')) {
      await handleStaticFile(req, res)
      return
    }
    /**
     * Handle the request using Elysia
     */
    if (req.url?.startsWith('/swagger') || req.url?.startsWith('/api/user') || req.url?.startsWith('/api/ext')) {
      const handled = await handleElysia(req, res)
      if (handled) {
        return
      }
    }
  } catch (e) {
    console.error(e)
    res.writeHead(500)
    res.end()
  }
  /**
   * Handle the request using tRPC
   */
  prefixedTRPCHandler(req, res)
})

const wss = new WebSocketServer({ server })
const handlerWs = applyWSSHandler({
  wss,
  router: appRouter,
  createContext: createContext as any,
  keepAlive: {
    enabled: true,
    pingMs: 30000,
    pongWaitMs: 5000
  }
})

process.on('SIGTERM', () => {
  console.log('SIGTERM')
  handlerWs.broadcastReconnectNotification()
})

server.on('upgrade', (req, socket, head) => {
  wss.handleUpgrade(req, socket as Socket, head, (ws) => {
    wss.emit('connection', ws, req)
  })
})

const originalOn = server.on.bind(server)
server.on = function (event, listener) {
  return event !== 'upgrade' ? originalOn(event, listener) : server
}

/**
 * Start the server
 */
server.listen(3001, '0.0.0.0')
