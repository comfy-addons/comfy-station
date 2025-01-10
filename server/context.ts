import { MikroORMInstance } from '@/services/mikro-orm.service'
import { verify } from 'jsonwebtoken'
import type { CreateNextContextOptions } from '@trpc/server/adapters/next'
import { User } from '@/entities/user'
import { BackendENV } from '@/env'
import { UserManagement } from '@/services/user.service'

/**
 * Creates context for an incoming request
 * @link https://trpc.io/docs/v11/context
 */
export const createContext = async (opts: CreateNextContextOptions) => {
  const orm = await MikroORMInstance.getInstance().getORM()
  const headers = opts.req.headers
  const rawAuthorization = headers['authorization'] ?? opts.info?.connectionParams?.Authorization
  const accessToken = rawAuthorization?.replace('Bearer', '').trim()

  const userIp = (headers['x-real-ip'] || headers['x-forwarded-for'] || opts.req.connection.remoteAddress) as string
  const userAgent = headers['user-agent']
  const em = orm.em.fork()

  const url = new URL(opts.req.url || '', 'http://localhost:3001')
  const baseUrl = `${url.protocol}//${url.host}`

  try {
    let user: User | null = null
    if (accessToken && accessToken.length > 0) {
      const tokenInfo = verify(accessToken, BackendENV.NEXTAUTH_SECRET) as { email: string }
      user = await em.findOne(User, { email: tokenInfo.email })
    }
    const output = {
      session: { user },
      em,
      headers,
      baseUrl,
      extra: {
        userIp,
        userAgent
      }
    }
    if (user) {
      void UserManagement.getInstance().handleUserEvent({ ...output, em: output.em.fork() })
    }
    return output
  } catch (e) {
    console.log(e)
    throw new Error('Invalid access token')
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>
