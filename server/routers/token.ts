import { Token } from '@/entities/token'
import { adminProcedure, privateProcedure } from '../procedure'
import { router } from '../trpc'
import { TokenShared } from '@/entities/token_shared'
import { ETokenType, EUserRole } from '@/entities/enum'
import { z } from 'zod'
import { Workflow } from '@/entities/workflow'
import { TokenPermission } from '@/entities/token_permission'
import { User } from '@/entities/user'
import { v4 } from 'uuid'
import { sign } from 'jsonwebtoken'
import { BackendENV } from '@/env'
import CachingService from '@services/caching.service'

export const tokenRouter = router({
  list: privateProcedure.query(async ({ ctx }) => {
    if (ctx.session.user?.role === EUserRole.Admin) {
      return await ctx.em.find(Token, {}, { populate: ['sharedUsers', 'grantedWorkflows.workflow.name', 'createdBy'] })
    }
    const ownedTokens = await ctx.em.find(
      Token,
      { createdBy: ctx.session.user },
      { populate: ['sharedUsers', 'createdBy', 'grantedWorkflows.workflow.name'] }
    )
    const sharedTokens = await ctx.em.find(
      Token,
      {
        sharedUsers: { user: ctx.session.user }
      },
      { populate: ['sharedUsers', 'createdBy', 'grantedWorkflows.workflow.name'] }
    )
    const tokens = [...ownedTokens, ...sharedTokens]
    return tokens
  }),
  get: privateProcedure.input(z.object({ tokenId: z.string() })).query(async ({ ctx, input }) => {
    if (ctx.session.user?.role === EUserRole.Admin) {
      return await ctx.em.findOneOrFail(
        Token,
        { id: input.tokenId },
        { populate: ['sharedUsers', 'createdBy', 'grantedWorkflows.workflow'] }
      )
    }
    return await ctx.em.findOneOrFail(
      Token,
      { id: input.tokenId, createdBy: ctx.session.user },
      { populate: ['sharedUsers', 'createdBy', 'grantedWorkflows.workflow'] }
    )
  }),
  listByWorkflow: privateProcedure
    .input(
      z.object({
        workflowId: z.string()
      })
    )
    .query(async ({ ctx, input }) => {
      const workflow = await ctx.em.findOneOrFail(Workflow, { id: input.workflowId })
      const filter =
        ctx.session.user?.role === EUserRole.Admin
          ? {}
          : { $or: [{ createdBy: ctx.session.user }, { sharedUsers: { user: ctx.session.user } }] }
      // Find tokens created by user
      const tokens = await ctx.em.find(
        Token,
        {
          $or: [{ grantedWorkflows: { workflow } }, { isMaster: true }],
          ...filter
        },
        { populate: ['sharedUsers', 'createdBy'] }
      )

      return {
        tokens
      }
    }),
  create: privateProcedure
    .input(
      z.object({
        expiredAt: z.date().optional(),
        type: z.nativeEnum(ETokenType),
        balance: z.number().optional(),
        description: z.string().optional(),
        weightOffset: z.number().optional(),
        workflowIds: z.array(z.string()).optional(),
        isMasterToken: z.boolean().optional().describe('Allow execute all workflow')
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user!.role !== EUserRole.Admin) {
        if (input.isMasterToken) {
          throw new Error('Only admins can create master tokens')
        }
        if (input.balance) {
          if (input.balance !== -1) {
            if (ctx.session.user!.balance < input.balance) {
              throw new Error('Insufficient balance')
            } else {
              ctx.session.user!.balance -= input.balance
            }
          }
        }
      }
      const token = ctx.em.create(
        Token,
        {
          createdBy: ctx.session.user!,
          type: input.type,
          expireAt: input.expiredAt,
          balance: input.balance ?? -1,
          description: input.description,
          weightOffset: input.weightOffset ?? 0,
          isMaster: input.isMasterToken ?? false
        },
        { partial: true }
      )
      if (input.workflowIds) {
        for (const id of input.workflowIds) {
          const workflow = await ctx.em.findOneOrFail(Workflow, { id })
          const perm = ctx.em.create(TokenPermission, { token, workflow }, { partial: true })
          token.grantedWorkflows.add(perm)
        }
      }
      await ctx.em.persistAndFlush(token)
      await CachingService.getInstance().set('USER_BALANCE', ctx.session.user!.id, ctx.session.user!.balance)
      return token
    }),
  update: privateProcedure
    .input(
      z.object({
        tokenId: z.string(),
        expiredAt: z.date().optional(),
        type: z.nativeEnum(ETokenType),
        balance: z.number().optional(),
        description: z.string().optional(),
        weightOffset: z.number().optional(),
        workflowIds: z.array(z.string()).optional(),
        isMasterToken: z.boolean().optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const token = await ctx.em.findOneOrFail(
        Token,
        { id: input.tokenId },
        { populate: ['grantedWorkflows.workflow'] }
      )
      if (ctx.session.user!.role !== EUserRole.Admin) {
        if (token.createdBy.id !== ctx.session.user!.id) {
          throw new Error('You do not have permission to update this token')
        }
        if (input.balance !== undefined && ctx.session.user!.balance !== -1) {
          if (input.balance === -1 && token.balance !== -1) {
            ctx.session.user!.balance += token.balance
          }
          if (token.balance === -1 && input.balance !== -1) {
            if (ctx.session.user!.balance < input.balance) {
              throw new Error('Insufficient balance')
            } else {
              ctx.session.user!.balance -= input.balance
            }
          }
          if (token.balance !== -1 && input.balance !== -1) {
            const offset = input.balance - token.balance
            if (ctx.session.user!.balance < offset) {
              throw new Error('Insufficient balance')
            } else {
              ctx.session.user!.balance -= offset
            }
          }
        }
      }

      token.expireAt = input.expiredAt
      token.type = input.type
      token.balance = input.balance || -1
      token.description = input.description
      token.weightOffset = input.weightOffset || 0
      token.isMaster = input.isMasterToken || false

      if (input.workflowIds) {
        token.grantedWorkflows.removeAll()
        for (const id of input.workflowIds) {
          const workflow = await ctx.em.findOneOrFail(Workflow, { id })
          const perm = ctx.em.create(TokenPermission, { token, workflow }, { partial: true })
          token.grantedWorkflows.add(perm)
        }
      }
      await ctx.em.persistAndFlush(token)
      await CachingService.getInstance().set('USER_BALANCE', ctx.session.user!.id, ctx.session.user!.balance)
      return token
    }),
  grantAccess: adminProcedure
    .input(
      z.object({
        tokenId: z.string(),
        workflowId: z.string(),
        weightOffset: z.number().optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const token = await ctx.em.findOneOrFail(Token, { id: input.tokenId })
      const workflow = await ctx.em.findOneOrFail(Workflow, { id: input.workflowId })
      const perm = ctx.em.create(
        TokenPermission,
        {
          token,
          workflow,
          weightOffset: input.weightOffset ?? 0
        },
        { partial: true }
      )
      token.grantedWorkflows.add(perm)
      await ctx.em.persistAndFlush(token)
      return true
    }),
  shareToken: privateProcedure
    .input(
      z.object({
        tokenId: z.string(),
        userId: z.string()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const token = await ctx.em.findOneOrFail(
        Token,
        { id: input.tokenId, createdBy: ctx.session.user! },
        { populate: ['sharedUsers.*'] }
      )
      if (token.sharedUsers.find((u) => u.user.id === user.id)) {
        throw Error('User already has access to this token')
      }
      const user = await ctx.em.findOneOrFail(User, { id: input.userId })
      const shared = ctx.em.create(TokenShared, { token, user }, { partial: true })
      token.sharedUsers.add(shared)
      await ctx.em.persistAndFlush(token)
      return true
    }),
  destroy: privateProcedure
    .input(
      z.object({
        tokenId: z.string()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const token = await ctx.em.findOneOrFail(Token, { id: input.tokenId }, { populate: ['sharedUsers', 'createdBy'] })
      if (ctx.session.user!.role !== EUserRole.Admin && token.createdBy.id !== ctx.session.user!.id) {
        throw new Error('You do not have permission to delete this token')
      }
      if (token.sharedUsers.length > 0) {
        // Remove shared users from token before deleting it.
        for (const shared of token.sharedUsers) {
          ctx.em.remove(shared)
        }
      }
      // Add balance back to user
      if (token.balance !== -1) {
        token.createdBy.balance += token.balance
        await CachingService.getInstance().set('USER_BALANCE', token.createdBy.id, token.createdBy.balance)
      }
      await ctx.em.removeAndFlush(token)
      return true
    }),
  reroll: privateProcedure
    .input(
      z.object({
        tokenId: z.string()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const token = await ctx.em.findOneOrFail(Token, { id: input.tokenId }, { populate: ['sharedUsers', 'createdBy'] })
      if (ctx.session.user!.role !== EUserRole.Admin && token.createdBy.id !== ctx.session.user!.id) {
        throw new Error('You do not have permission to reroll this token')
      }
      token.id = sign({ id: v4() }, BackendENV.INTERNAL_SECRET)
      await ctx.em.persistAndFlush(token)
      return true
    })
})
