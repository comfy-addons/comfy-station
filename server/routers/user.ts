import { z } from 'zod'
import { adminProcedure, privateProcedure } from '../procedure'
import { router } from '../trpc'
import { User } from '@/entities/user'
import { EDeviceStatus, ETaskStatus, EUserRole } from '@/entities/enum'
import { Attachment } from '@/entities/attachment'
import { WorkflowTask } from '@/entities/workflow_task'
import CachingService from '@/services/caching.service'
import { UserClient } from '@/entities/user_clients'

export const userRouter = router({
  list: adminProcedure.query(async ({ ctx }) => {
    const users = await ctx.em.find(User, {}, { populate: ['avatar'] })
    const output = await Promise.all(
      users.map(async (user) => {
        const onlineDevices = await ctx.em.find(UserClient, {
          user,
          deviceStatus: { $in: [EDeviceStatus.ONLINE, EDeviceStatus.IDLE] }
        })
        return {
          user,
          status: onlineDevices?.some((dv) => dv.deviceStatus === EDeviceStatus.ONLINE)
            ? EDeviceStatus.ONLINE
            : onlineDevices?.some((dv) => dv.deviceStatus === EDeviceStatus.IDLE)
              ? EDeviceStatus.IDLE
              : EDeviceStatus.OFFLINE,
          runCount: await ctx.em.count(WorkflowTask, {
            status: { $ne: ETaskStatus.Parent },
            trigger: { user }
          })
        }
      })
    )
    return output
  }),
  adminCreate: adminProcedure
    .input(
      z.object({
        email: z.string().email(),
        avatarId: z.string().optional(),
        role: z.nativeEnum(EUserRole),
        balance: z.number().optional(),
        weightOffset: z.number().optional(),
        password: z.string().min(8)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.em.create(
        User,
        {
          email: input.email,
          role: input.role,
          balance: input.balance,
          weightOffset: input.weightOffset,
          password: input.password
        },
        { partial: true }
      )
      if (input.avatarId) {
        const avatar = await ctx.em.findOneOrFail(Attachment, input.avatarId)
        user.avatar = avatar
      }
      await ctx.em.persistAndFlush(user)
      return true
    }),
  adminUpdate: adminProcedure
    .input(
      z.object({
        id: z.string(),
        avatarId: z.string().optional(),
        role: z.nativeEnum(EUserRole).optional(),
        balance: z.number().optional(),
        weightOffset: z.number().optional(),
        password: z.string().optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.em.findOneOrFail(User, input.id)
      if (input.avatarId !== undefined) {
        const avatar = await ctx.em.findOneOrFail(Attachment, input.avatarId)
        user.avatar = avatar
      }
      if (input.role !== undefined) user.role = input.role
      if (input.balance !== undefined) {
        user.balance = input.balance
        await CachingService.getInstance().set('USER_BALANCE', user.id, user.balance)
      }
      if (input.weightOffset !== undefined) user.weightOffset = input.weightOffset
      if (input.password !== undefined && input.password.length >= 8) user.password = User.hashPassword(input.password)
      await ctx.em.flush()
      return true
    }),
  userUpdate: privateProcedure
    .input(
      z.object({
        avatarId: z.string().optional(),
        password: z.string().optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user!
      if (input.avatarId !== undefined) {
        const avatar = await ctx.em.findOneOrFail(Attachment, input.avatarId)
        user.avatar = avatar
      }
      if (input.password !== undefined && input.password.length >= 8) user.password = User.hashPassword(input.password)
      await ctx.em.flush()
      return true
    }),
  delete: adminProcedure
    .input(
      z.object({
        id: z.string()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.em.findOneOrFail(User, input.id)
      const tasks = await ctx.em.find(
        WorkflowTask,
        {
          trigger: { user }
        },
        {
          populate: ['attachments']
        }
      )
      tasks.flatMap((task) => task.attachments).forEach((attachment) => ctx.em.remove(attachment))
      tasks.forEach((task) => ctx.em.remove(task))
      await ctx.em.remove(user).flush()
      return true
    })
})
