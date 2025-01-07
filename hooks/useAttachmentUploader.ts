import { ECompressPreset } from '@/constants/enum'
import { trpc } from '@/utils/trpc'

export const useAttachmentUploader = () => {
  const uploader = trpc.attachment.upload.useMutation()
  const uploadAttachment = async (
    file: File,
    opts?: {
      /**
       * Resize image to max width/height
       */
      resizeToMax: number
      compressPreset?: ECompressPreset
    }
  ) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('name', file.name)
    if (opts?.resizeToMax) {
      formData.append('maxWidthHeightSize', String(opts.resizeToMax))
    }
    if (opts?.compressPreset) {
      formData.append('type', opts.compressPreset)
    }
    return uploader.mutateAsync(formData)
  }

  return { uploader, uploadAttachment }
}
