import { GenerativeFunctionMaker } from '@/server/utils/generative'
import { z } from 'zod'

const InputSchema = z.object({
  requirement: z.string().describe('Type of prompt to generate.').optional(),
  describe: z.string().describe('Current user prompt or requirement.')
})

const OutputSchema = z.object({
  output: z.string().describe('New better prompt for stable diffusion.')
})

export const BetterPromptGenerative = new GenerativeFunctionMaker({
  prompt:
    'You are a Stable Diffusion prompt generator. Follow the user requirement and generate a better prompt for stable diffusion.',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  showLog: true
})
  .setUserPromptBuilder((input) => {
    const requirement = input.requirement || 'Generete a better prompt for stable diffusion.'
    return `Requirement: ${requirement}\nCurrent Describe: ${input.describe}`
  })
  .make()
