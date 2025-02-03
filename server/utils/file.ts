import { EValueType } from '@/entities/enum'

export function classifyMine(mine: string): EValueType.Image | EValueType.Video | EValueType.File {
  if (mine.startsWith('image/')) {
    return EValueType.Image
  } else if (mine.startsWith('video/')) {
    return EValueType.Video
  } else {
    return EValueType.File
  }
}

/**
 * Determine the type of a Blob: Image, Video, or Other.
 * @param blob - The Blob to classify.
 * @returns A string indicating the type: 'image', 'video', or 'other'.
 */
export function classifyBlob(blob: Blob): EValueType.Image | EValueType.Video | EValueType.File {
  const mimeType = blob.type // Get the MIME type from the Blob
  return classifyMine(mimeType)
}
