import { EAttachmentStatus, EValueType } from '@/entities/enum'
import { EAttachmentType } from '@services/attachment.service'
import { t } from 'elysia'

export const AttachmentSchema = t.Object({
  id: t.String(),
  fileName: t.String(),
  size: t.Number(),
  ratio: t.Number(),
  type: t.UnionEnum([EValueType.File, EValueType.Image, EValueType.Video]),
  status: t.Enum(EAttachmentStatus),
  storageType: t.String(),
  taskEvent: t.Optional(t.Null()),
  task: t.Optional(t.String()),
  workflow: t.String(),
  createdAt: t.String(),
  updateAt: t.String()
})

export const AttachmentURLSchema = t.Object({
  type: t.Enum(EAttachmentType),
  url: t.String()
})
