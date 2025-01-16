import { MikroORMInstance } from '@services/mikro-orm.service'
import { verify } from 'jsonwebtoken'
import type { CreateNextContextOptions } from '@trpc/server/adapters/next'
import { User } from '@/entities/user'
import { BackendENV } from '@/env'
import { UserManagement } from '@services/user.service'
import { Logger } from '@saintno/needed-tools'

const logger = new Logger('tRPC')

/**
 * Creates context for an incoming request
 * @link https://trpc.io/docs/v11/context
 */
export const createContext = async (opts: CreateNextContextOptions) => {
  const start = performance.now()
  const orm = await MikroORMInstance.getInstance().getORM()
  const em = orm.em.fork()

  // Handle authorization
  let user: User | null = null
  const headers = opts.req.headers
  const rawAuthorization = headers['authorization'] ?? opts.info?.connectionParams?.Authorization
  const accessToken = rawAuthorization?.replace('Bearer', '').trim()
  try {
    if (accessToken && accessToken.length > 0) {
      const tokenInfo = verify(accessToken, BackendENV.NEXTAUTH_SECRET) as { email: string }
      user = await em.findOne(User, { email: tokenInfo.email })
    }
  } catch (e) {
    throw new Error('Invalid access token')
  }

  // Get user IP and user agent
  const userIp = (headers['x-real-ip'] || headers['x-forwarded-for'] || opts.req.connection.remoteAddress) as string
  const userAgent = headers['user-agent']

  // Get current base URL
  let baseUrl = BackendENV.BACKEND_URL
  if (!!opts.req.headers?.host) {
    const httpProtocol =
      opts.req.headers['x-forwarded-proto'] ||
      opts.req.headers['x-forwarded-protocol'] ||
      (opts.req as any).protocol ||
      'http'
    baseUrl = `${httpProtocol}://${opts.req.headers?.host}`
  }

  // Make the output to be passed to the context
  const output = {
    session: { user },
    log: logger,
    em,
    headers,
    baseUrl,
    extra: {
      userIp,
      userAgent
    }
  }

  // Track user event
  if (user) {
    void UserManagement.getInstance().handleUserEvent({ ...output, em: orm.em.fork() })
  }

  // Logging request
  opts.res.on('finish', () => {
    logger.i(opts.req.method || 'WS', user ? `User ${user.email} requested` : 'Processed request', {
      queries: opts.info.calls.map((v) => v.path),
      time: Math.round((performance.now() - start) / 1000) + 'ms'
    })
  })
  return output
}

export type Context = Awaited<ReturnType<typeof createContext>>
