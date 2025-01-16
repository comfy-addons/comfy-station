/* eslint-disable no-unused-vars */
import { AIMessageChunk, BaseMessageFields, HumanMessage, SystemMessage } from '@langchain/core/messages'
import { tool } from '@langchain/core/tools'
import { Logger, QueueManager, StorageManager } from '@saintno/needed-tools'
import { ChatOpenAI, ChatOpenAICallOptions } from '@langchain/openai'
import crypto from 'crypto'
import { z } from 'zod'
import { Err, Ok } from 'ts-results'
import { BackendENV } from '@/env'
import { BaseLanguageModelInput } from '@langchain/core/language_models/base'
import { Runnable } from '@langchain/core/runnables'

const HQQueue = new QueueManager('HQQueue', 1, true)
const Storage = new StorageManager<{ prompt: string }>('PromptStorage')

type TInput = z.AnyZodObject | z.ZodString | z.ZodEffects<any>

export class GenerativeFunctionMaker<I extends z.ZodObject<any>, O extends TInput> {
  private id: string
  private rawPrompt: string
  private logger: Logger
  private outputMethod: 'raw' | 'tool'
  private systemInstructionAddon?: string
  private autoPrompting: boolean = true
  private inputSchema: I
  private outputSchema: O
  private llm?: Runnable<BaseLanguageModelInput, AIMessageChunk, ChatOpenAICallOptions>
  private mkUserPrompt?: (input: z.infer<I>) => string | BaseMessageFields

  constructor({
    prompt,
    inputSchema,
    outputSchema,
    showLog
  }: {
    prompt: string
    inputSchema: I
    outputSchema: O
    showLog?: boolean
  }) {
    this.rawPrompt = prompt
    this.outputMethod = 'tool'
    this.inputSchema = inputSchema
    this.outputSchema = outputSchema
    this.id = crypto.createHash('md5').update(prompt).digest('hex')
    this.logger = new Logger(`GenerativeFunctionMaker#${this.id}`, !!showLog)

    if (!BackendENV.OPENAI_API_KEY) {
      this.logger.w('constructor', 'OpenAI API Key is not set, this feature will not work.')
    } else {
      const llm = new ChatOpenAI({
        model: BackendENV.OPENAI_MODEL,
        temperature: 0,
        maxTokens: -1,
        cache: true
      })
      const tools = this.getOutputTool()
      if (tools) {
        this.llm = llm.bindTools(tools)
      }
    }
  }

  get config() {
    return {
      prompt: this.rawPrompt,
      inputSchema: this.inputSchema,
      outputSchema: this.outputSchema,
      autoPrompting: this.autoPrompting,
      systemInstructionAddon: this.systemInstructionAddon
    }
  }

  private getOutputTool() {
    if (this.outputMethod !== 'tool') {
      return undefined
    }
    return [
      tool(
        (data) => {
          if (this.outputSchema!.safeParse(data).success) {
            return 'DONE'
          }
          throw new Error('Invalid output data')
        },
        {
          name: 'OutputTool',
          description: 'Use for return output data',
          schema: this.outputSchema
        }
      )
    ]
  }

  /**
   * Tell the make not to use system instruction generator
   * Send Raw prompt to LLM
   */
  useRawSystemInstruction() {
    this.autoPrompting = false
    return this
  }

  useRawOutput() {
    this.outputMethod = 'raw'
    return this
  }

  setUserPromptBuilder(mkUserPrompt: (input: z.infer<I>) => string | BaseMessageFields) {
    this.mkUserPrompt = mkUserPrompt
    return this
  }

  setSystemInstructionAddon(addon: string) {
    this.systemInstructionAddon = addon
    this.id = crypto
      .createHash('md5')
      .update(this.rawPrompt + addon)
      .digest('hex')
    return this
  }

  private async systemInstructionGenerator() {
    let instruction = `
You are a Prompt Engineer. Read the user's raw prompt and generate a new, optimized system's instruction prompt. Output only the new prompt, without any additional text. Ensure to tell the bot do not make up fact.`
    if (this.outputMethod === 'tool') {
      instruction += `\nEnsure to tell the bot use OutputTool to return the data.\nEnsure to tell the bot output a valid json.`
    }
    if (this.systemInstructionAddon) {
      instruction += `\n${this.systemInstructionAddon}`
    }
    const llm = new ChatOpenAI({
      model: 'gpt-4o',
      temperature: 0,
      maxTokens: -1,
      cache: true
    })
    const response = await llm.invoke([
      new SystemMessage(instruction),
      new HumanMessage(`Tune this prompt: ${this.rawPrompt}`)
    ])
    return response.content.toString()
  }

  public async getGenerativePrompt() {
    if (!this.autoPrompting) return this.rawPrompt
    /**
     * Force job to be in queue => prevent multiple system instruction generation at the same time
     * This will slow on first time if system instruction not exist
     */
    return HQQueue.wait(async () => {
      const data = await Storage.get(this.id)
      if (data?.prompt) {
        this.logger.i('getGenerativePrompt', 'Cached, return the system prompt', {
          prompt: data.prompt
        })
        return data.prompt
      } else {
        const tunedPrompt = await this.systemInstructionGenerator()
        this.logger.i('getGenerativePrompt', 'Not cached, generated new prompt', {
          prompt: tunedPrompt
        })
        await Storage.set(this.id, { prompt: tunedPrompt })
        return tunedPrompt
      }
    })
  }

  public make() {
    return async (input: z.infer<I>) => {
      if (!this.llm) {
        return Err('LLM is not set.')
      }
      const fnStart = performance.now()
      const data = await this.inputSchema.safeParseAsync(input)
      if (!data.success) {
        return Err(data.error)
      }
      if (!this.mkUserPrompt) {
        return Err('User prompt builder is not set.')
      }
      if (!this.llm) {
        return Err('LLM is not set.')
      }
      this.logger.i('execute', 'PromptExecution', { input: data.data })
      const SystemPrompt = new SystemMessage(await this.getGenerativePrompt())
      const UserPrompt = new HumanMessage(this.mkUserPrompt(data.data))
      const llmStart = performance.now()
      const res = await this.llm.invoke([SystemPrompt, UserPrompt])
      const time = performance.now() - fnStart
      const llmTime = performance.now() - llmStart

      if (!this.outputSchema) {
        this.logger.w('execute', 'Output schema is not set.', {
          metadata: res.usage_metadata,
          time,
          llmTime
        })
        return Err('Output schema is not set.')
      }

      const output =
        this.outputMethod === 'raw'
          ? await this.outputSchema.safeParseAsync(res.content.toString())
          : await this.outputSchema.safeParseAsync(res.tool_calls?.[0]?.args || {})
      if (!output.success) {
        this.logger.w('execute', 'PromptExecution with failed output', {
          error: output.error,
          res: res.content.toString(),
          time,
          llmTime
        })
        return Err(output.error)
      }
      this.logger.i('execute', 'PromptExecution success', {
        metadata: res.usage_metadata,
        time,
        llmTime
      })
      return Ok({
        time,
        llmTime,
        raw: res,
        data: output.data as z.infer<O>
      })
    }
  }
}
