import { ECompressPreset } from '@/constants/enum'
import { trpc } from '@/utils/trpc'

/**
 * Options for file upload
 */
interface UploadOptions {
  /** Maximum width/height to resize the image to */
  resizeToMax?: number
  /** Compression preset for the image */
  compressPreset?: ECompressPreset
}

/**
 * Hook for handling file uploads with optional image processing
 *
 * @returns Object containing uploader mutation and upload helper function
 *
 * @example
 * const { uploadAttachment } = useAttachmentUploader();
 *
 * // Basic upload
 * const result = await uploadAttachment(file);
 *
 * // Upload with image processing
 * const result = await uploadAttachment(file, {
 *   resizeToMax: 1024,
 *   compressPreset: ECompressPreset.HIGH
 * });
 */
export const useAttachmentUploader = () => {
  const uploader = trpc.attachment.upload.useMutation()

  /**
   * Upload a file with optional image processing
   *
   * @param file - File to upload
   * @param opts - Optional upload configuration
   * @returns Promise with upload result
   * @throws Will throw an error if upload fails
   */
  const uploadAttachment = async (file: File, opts?: UploadOptions) => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('name', file.name)

      if (opts?.resizeToMax) {
        formData.append('maxWidthHeightSize', String(opts.resizeToMax))
      }

      if (opts?.compressPreset) {
        formData.append('type', opts.compressPreset)
      }

      return await uploader.mutateAsync(formData)
    } catch (error) {
      throw new Error(`Failed to upload file: ${(error as Error).message}`)
    }
  }

  return { uploader, uploadAttachment }
}
