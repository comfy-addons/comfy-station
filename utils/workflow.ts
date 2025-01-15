import { EValueType } from '@/entities/enum'
import { Workflow } from '@/entities/workflow'
import { ComfyApi, PromptBuilder } from '@saintno/comfyui-sdk'
import { z } from 'zod'

const TSimpleValue = z.union([z.string(), z.number(), z.boolean()])

const TNodeReference = z.tuple([z.string(), z.number()])

const TOtherExtension = z.record(
  z.union([TSimpleValue, TNodeReference, z.array(z.union([TSimpleValue, TNodeReference, z.record(TSimpleValue)]))])
)

const TInputValue = z.union([
  TSimpleValue, // Normal value
  TNodeReference, // Reference to another node
  TOtherExtension, // Custom node inputs
  z.array(z.union([TSimpleValue, TNodeReference]))
])

const IInputs = z.record(TInputValue)

const TMeta = z.object({
  title: z.string()
})

const INode = z.object({
  inputs: IInputs,
  class_type: z.string(),
  _meta: TMeta.optional()
})
const IWorkflow = z.record(INode)

export const isValidWorkflow = (workflow: unknown): workflow is IWorkflow => {
  return IWorkflow.safeParse(workflow).success
}

export const getBuilder = (workflow: Workflow) => {
  const inputKeys = Object.keys(workflow.mapInput ?? {})
  const outputKeys = Object.keys(workflow.mapOutput ?? {})
  const rawWorkflow = JSON.parse(workflow.rawWorkflow)
  // Clean info data
  for (const key in rawWorkflow) {
    delete rawWorkflow[key].info
  }

  // Create PromptBuilder
  const builder = new PromptBuilder(rawWorkflow, inputKeys, outputKeys)
  for (const inputKey of inputKeys) {
    const input = workflow.mapInput?.[inputKey]
    if (!input) continue
    builder.setInputNode(
      inputKey,
      input.target.map((t) => t.mapVal)
    )
  }
  for (const outputKey of outputKeys) {
    const output = workflow.mapOutput?.[outputKey]
    if (!output) continue
    builder.setOutputNode(outputKey, output.target.mapVal)
  }
  return builder
}

export const parseOutput = async (api: ComfyApi, workflow: Workflow, data: any) => {
  const mapOutput = workflow.mapOutput
  const dataOut: Record<string, number | boolean | string | Array<Blob>> = {}
  for (const key in mapOutput) {
    let tmp: any
    const outputConf = mapOutput[key]
    const output = data[key]
    if (outputConf.target.keyName) {
      if (output[outputConf.target.keyName]) {
        tmp = output[outputConf.target.keyName]
      }
    }
    switch (outputConf.type) {
      case EValueType.Boolean:
        tmp = Boolean(tmp)
        break
      case EValueType.Number:
        tmp = Number(tmp)
        break
      case EValueType.String:
        if (!tmp && 'text' in output) {
          tmp = output.text
        }
        if (Array.isArray(tmp)) {
          tmp = tmp.join('')
        } else {
          tmp = String(tmp)
        }
        break
      case EValueType.Image:
        if (!tmp && 'images' in output) {
          const { images } = output
          tmp = await Promise.all(images.map((img: any) => api.getImage(img)))
          break
        }
      case EValueType.File:
        if (tmp) {
          if (Array.isArray(tmp)) {
            tmp = await Promise.all(tmp.map((media: any) => api.getImage(media)))
          } else {
            tmp = [await api.getImage(tmp)]
          }
        }
    }
    if (tmp) {
      dataOut[key] = tmp
    }
  }
  return dataOut
}
