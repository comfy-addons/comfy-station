import { privateProcedure } from '../procedure'
import { router } from '../trpc'
import { z } from 'zod'
import { EDeviceStatus } from '@/entities/enum'
import { UserClient } from '@/entities/user_clients'

export const userClientRouter = router({
  ping: privateProcedure.mutation(async ({ ctx }) => {
    return 'pong'
  }),
  updateStatus: privateProcedure
    .input(
      z.object({
        status: z.nativeEnum(EDeviceStatus)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const client = await ctx.em.findOneOrFail(UserClient, {
        user: { id: ctx.session.user.id },
        userAgent: ctx.extra.userAgent
      })
      client.deviceStatus = input.status
      await ctx.em.persistAndFlush(client)
    })
})
