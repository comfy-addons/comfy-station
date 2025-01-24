import { MikroORMInstance } from '@/server/services/mikro-orm'
import { verify } from 'jsonwebtoken'
import { User } from '@/entities/user'
import { BackendENV } from '@/env'
import { UserManagement } from '@/server/services/user'
import { Logger } from '@saintno/needed-tools'
import { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch'

const logger = new Logger('tRPC')

/**
 * Creates context for an incoming request
 * @link https://trpc.io/docs/v11/context
 */
export const createContext = async (opts: FetchCreateContextFnOptions) => {
  const orm = await MikroORMInstance.getInstance().getORM()
  const em = orm.em.fork()
  const url = new URL(opts.req.url || '', BackendENV.BACKEND_URL)
  const queries = url.searchParams

  // Handle authorization
  let user: User | null = null
  const headers = opts.req.headers
  const rawAuthorization =
    headers.get('authorization') || opts.info?.connectionParams?.Authorization || queries.get('auth')
  const accessToken = rawAuthorization?.replace('Bearer', '').trim()
  try {
    if (accessToken && accessToken.length > 0) {
      const tokenInfo = verify(accessToken, BackendENV.NEXTAUTH_SECRET) as { email: string; isWs: boolean }
      if (tokenInfo.isWs && !url.pathname.startsWith('/ws')) {
        throw new Error('Invalid access token')
      }
      user = await em.findOne(User, { email: tokenInfo.email })
    }
  } catch (e) {
    throw new Error('Invalid access token')
  }

  // Get user IP and user agent
  const userIp = headers.get('x-real-ip') || headers.get('x-forwarded-for')
  const userAgent = headers.get('user-agent')

  // Get current base URL
  let baseUrl = BackendENV.BACKEND_URL
  if (!!headers.get('host')) {
    const httpProtocol =
      headers.get('x-forwarded-proto') || headers.get('x-forwarded-protocol') || (opts.req as any).protocol || 'http'
    baseUrl = `${httpProtocol}://${headers.get('host')}`
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
  logger.i(opts.req.method || 'WS', user ? `User ${user.email} requested` : 'Processed request', {
    queries: opts.info?.calls?.map((v) => v.path) || 'ws'
  })

  return output
}

export type Context = Awaited<ReturnType<typeof createContext>>
