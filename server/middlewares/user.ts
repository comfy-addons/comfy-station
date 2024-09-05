import { TRPCError } from '@trpc/server'
import { middleware } from '../trpc'
import { EUserRole } from '@/entities/enum'

export const authChecker = middleware(({ next, ctx }) => {
  const user = ctx.session

  if (!user?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }

  return next()
})

export const adminChecker = middleware(({ next, ctx }) => {
  const user = ctx.session

  if (!user?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }

  if (!user?.user?.role || user.user.role !== EUserRole.Admin) {
    throw new TRPCError({ code: 'FORBIDDEN' })
  }

  return next()
})
