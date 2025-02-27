import { MikroORMInstance } from '@/server/services/mikro-orm'
import { JWTService, TokenExpiredError } from './services/jwt'
import { BackendENV } from '@/env'
import { UserManagement } from '@/server/services/user'
import { Logger } from '@saintno/needed-tools'
import { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch'
import { Context } from '@/types/context'
import { JWTContext } from '@/types/jwt'
import { TRPCError } from '@trpc/server'
import type { TRPCAuthError } from '@/types/error'

const logger = new Logger('tRPC')
const jwtService = JWTService.getInstance()

/**
 * Creates context for an incoming request
 * @link https://trpc.io/docs/v11/context
 */
export const createContext = async (opts: FetchCreateContextFnOptions): Promise<Context> => {
  const orm = await MikroORMInstance.getInstance().getORM()
  const em = orm.em.fork()
  const url = new URL(opts.req.url || '', BackendENV.BACKEND_URL)
  const queries = url.searchParams

  // Handle authorization
  let user: JWTContext | null = null
  const headers = opts.req.headers
  const rawAuthorization =
    headers.get('authorization') || opts.info?.connectionParams?.Authorization || queries.get('auth')
  const accessToken = rawAuthorization?.replace('Bearer', '').trim()
  try {
    if (accessToken && accessToken.length > 0) {
      try {
        const tokenInfo = jwtService.verifyToken(accessToken)
        if (tokenInfo.isWs && !url.pathname.startsWith('/ws')) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Invalid token type'
          })
        }
        user = {
          id: tokenInfo.id,
          role: tokenInfo.role,
          balance: tokenInfo.balance,
          weightOffset: tokenInfo.weightOffset,
          createdAt: new Date(tokenInfo.createdAt),
          updateAt: new Date(tokenInfo.updateAt)
        }
      } catch (error) {
        if (error instanceof Error) {
          if (error instanceof TokenExpiredError) {
            throw new TRPCError({
              code: 'UNAUTHORIZED',
              message: 'Token has expired',
              cause: {
                code: 'TOKEN_EXPIRED',
                status: 401
              }
            })
          }
        }
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid or malformed token',
          cause: {
            code: 'INVALID_TOKEN',
            status: 401
          }
        })
      }
    }
  } catch (e) {
    if (e instanceof TRPCError) {
      const authError = e as TRPCAuthError
      if (authError.cause?.code === 'TOKEN_EXPIRED') {
        opts.req.headers.set('X-Token-Expired', 'true')
      }
      throw e
    }
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication failed',
      cause: {
        code: 'AUTH_FAILED',
        status: 401
      }
    })
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
  const output: Context = {
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
  logger.i(opts.req.method || 'WS', user ? `User ${user.id} requested` : 'Processed request', {
    queries: opts.info?.calls?.map((v) => v.path) || 'ws'
  })

  return output
}
