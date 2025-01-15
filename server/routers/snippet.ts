import { privateProcedure } from '../procedure'
import { router } from '../trpc'
import { z } from 'zod'
import { Workflow } from '@/entities/workflow'

import { EValueType, EValueUtilityType } from '@/entities/enum'
import {
  AttachmentSnippet,
  ConvertSnippet,
  TaskAttachmentSnippet,
  TaskStatusSnippet,
  WorkflowSnippet
} from '../constants/snippets'

export const snippetRouter = router({
  workflow: privateProcedure
    .input(z.object({ id: z.string(), input: z.record(z.string(), z.any()).optional(), host: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      let needUpload = false
      const host = input.host
      const workflow = await ctx.em.findOneOrFail(Workflow, { id: input.id })
      const inputBody: Record<string, string | number | boolean> = {}
      for (const inputKey in workflow.mapInput) {
        if (workflow.mapInput[inputKey].type === EValueUtilityType.Prefixer) continue
        if (
          [EValueType.File, EValueType.Image, EValueType.Video].includes(workflow.mapInput[inputKey].type as EValueType)
        ) {
          inputBody[inputKey] = '<attachment_id>'
          needUpload = true
          continue
        }
        if (workflow.mapInput[inputKey].type === EValueUtilityType.Seed) {
          inputBody[inputKey] = -1
        } else {
          if (input.input && input.input[inputKey]) {
            inputBody[inputKey] = input.input[inputKey]
          } else {
            inputBody[inputKey] = workflow.mapInput[inputKey].default ?? ''
          }
        }
      }
      try {
        const snippets = [
          {
            name: 'Upload Attachment',
            description: 'Upload an attachment for using in workflow',
            snippet: AttachmentSnippet({ host })
          },
          {
            name: 'Execute Workflow',
            description: 'Execute a workflow and return a task',
            snippet: WorkflowSnippet({ id: input.id, input: inputBody, host })
          },
          {
            name: 'Task Status',
            description: 'Get task status',
            snippet: TaskStatusSnippet({ id: 'YOUR_TASK_ID', host })
          },
          {
            name: 'Task Attachment',
            description: 'Get task attachments after done',
            snippet: TaskAttachmentSnippet({ id: 'YOUR_TASK_ID', host })
          }
        ]
        if (!needUpload) {
          snippets.shift()
        }

        return snippets.map(({ name, description, snippet }) => ({
          name,
          description,
          snippets: ConvertSnippet(snippet)
        }))
      } catch (e) {
        console.log(e)
        return []
      }
    })
})
