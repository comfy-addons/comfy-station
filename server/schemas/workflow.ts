import { EValueSelectionType, EValueType } from '@/entities/enum'
import { t } from 'elysia'

export const WorkflowInputSchema = t.Record(
  t.String(),
  t.Object({
    type: t.Enum(EValueType),
    default: t.Optional(t.String()),
    description: t.Optional(t.String()),
    options: t.Optional(t.Array(t.String()))
  }),
  {
    description: 'Workflow input',
    default: {
      caption: { type: EValueType.String, description: '', default: '' },
      negative: { type: EValueType.String, description: '', default: '' },
      checkpoints: { type: EValueSelectionType.Checkpoint, description: '', default: '', options: [] }
    }
  }
)

export const WorkflowOutputSchema = t.Record(
  t.String(),
  t.Object({
    type: t.Enum(EValueType),
    description: t.Optional(t.String())
  }),
  {
    description: 'Workflow output',
    default: {
      caption: { type: EValueType.String, description: '' },
      negative: { type: EValueType.String, description: '' }
    }
  }
)
