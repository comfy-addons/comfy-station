import { Tag } from '@/entities/tag'
import { adminProcedure, privateProcedure } from '../procedure'
import { router } from '../trpc'
import { z } from 'zod'
import { BackendENV } from '@/env'
import { BetterPromptGenerative } from '../generatives/better-prompting'

export const generativeRouter = router({
  isEnabled: privateProcedure.query(async ({ ctx }) => {
    return !!BackendENV.OPENAI_API_KEY
  }),
  prompt: privateProcedure
    .input(
      z.object({
        requirement: z.string().describe('Type of prompt to generate.').optional(),
        describe: z.string().describe('Current user prompt or requirement.')
      })
    )
    .mutation(async ({ input }) => {
      const output = await BetterPromptGenerative(input)
      if (output.ok) {
        return output.val.data
      } else {
        console.warn(output.val)
        throw new Error('Failed to generate better prompt.')
      }
    })
})
