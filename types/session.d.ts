import { Attachment } from '@/entities/attachment'
import { EUserRole } from '../entities/enum'
import { User } from '../entities/user'
import { Loaded } from '@mikro-orm/core'
import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: Loaded<User, 'avatar', '*', never>
    accessToken: {
      token: string
      wsToken: string
    }
  }
}
