import type { Logger } from '@saintno/needed-tools'
import type { EntityManager } from '@mikro-orm/core'
import type { JWTContext } from './jwt'
import { User } from '@/entities/user'

export interface Context {
  session: {
    user: JWTContext | null
    getFullUser?: () => Promise<User | null>
  }
  log: Logger
  em: EntityManager
  headers: Headers
  baseUrl: string
  extra: {
    userIp: string | null
    userAgent: string | null
  }
}
