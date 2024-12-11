import { createServer } from 'http'
import cors from 'cors'
import { WebSocketServer } from 'ws'
import type { Socket } from 'net'
import { applyWSSHandler } from '@trpc/server/adapters/ws'
import AttachmentService from '@/services/attachment'
import CachingService from '@/services/caching'
import { ComfyPoolInstance } from '@/services/comfyui'
import { MikroORMInstance } from '@/services/mikro-orm'
import { SharedStorage } from '@/services/shared'
import { createHTTPHandler } from '@trpc/server/adapters/standalone'

import { convertIMessToRequest } from './utils/request'
import { ElysiaHandler } from './elysia'
import { appRouter } from './routers/_app'
import { createContext } from './context'

/**
 * Initialize all services
 */
MikroORMInstance.getInstance()
ComfyPoolInstance.getInstance()
AttachmentService.getInstance()
CachingService.getInstance()
SharedStorage.getInstance()

export const tRPCHandler = createHTTPHandler({
  middleware: cors(),
  router: appRouter,
  createContext: createContext as any
})

const server = createServer(async (req, res) => {
  try {
    /**
     * Handle the request using Elysia
     */
    if (req.url?.startsWith('/swagger') || req.url?.startsWith('/user') || req.url?.startsWith('/ext/api')) {
      const request = await convertIMessToRequest(req)
      const output = await ElysiaHandler.handle(request)
      // If the response is 404, then passthrough request to tRPC's handler
      if (output.status !== 404) {
        res.writeHead(output.status, {
          'Content-Type': output.headers.get('content-type') ?? 'application/json'
        })
        const data = await output.text()
        res.write(data)
        res.end()
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
  tRPCHandler(req, res)
})

const wss = new WebSocketServer({ server })
const handlerWs = applyWSSHandler({ wss, router: appRouter, createContext: createContext as any })

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
