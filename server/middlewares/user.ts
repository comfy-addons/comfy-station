import { TRPCError } from '@trpc/server'
import { middleware } from '../trpc'
import { EUserRole } from '@/entities/enum'
import { JWTContext } from '@/types/jwt'
import { EntityManager } from '@mikro-orm/core'
import { User } from '@/entities/user'

export const authChecker = middleware(({ next, ctx }) => {
  const user = ctx.session

  if (!user?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }

  return next({
    ctx: {
      ...ctx,
      session: {
        ...ctx.session,
        user: user.user,
        getFullUser: async () => {
          return await loadFullUser(ctx.em, user.user!)
        }
      }
    }
  })
})

export const editorChecker = middleware(({ next, ctx }) => {
  const user = ctx.session

  if (!user?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }

  if (!user?.user?.role || user.user.role < EUserRole.Editor) {
    throw new TRPCError({ code: 'FORBIDDEN' })
  }

  return next({
    ctx: {
      ...ctx,
      session: {
        ...ctx.session,
        user: user.user,
        getFullUser: async () => {
          return await loadFullUser(ctx.em, user.user!)
        }
      }
    }
  })
})

export const adminChecker = middleware(({ next, ctx }) => {
  const user = ctx.session

  if (!user?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }

  if (!user?.user?.role || user.user.role !== EUserRole.Admin) {
    throw new TRPCError({ code: 'FORBIDDEN' })
  }

  return next({
    ctx: {
      ...ctx,
      session: {
        ...ctx.session,
        user: user.user,
        getFullUser: async () => {
          return await loadFullUser(ctx.em, user.user!)
        }
      }
    }
  })
})

// Utility function to load full user from database when needed
export const loadFullUser = async (em: EntityManager, user: JWTContext): Promise<User> => {
  return await em.findOneOrFail(User, { id: user.id }, { populate: ['avatar'] })
}
