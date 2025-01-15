/**
 * Determine the type of a Blob: Image, Video, or Other.
 * @param blob - The Blob to classify.
 * @returns A string indicating the type: 'image', 'video', or 'other'.
 */
export function classifyBlob(blob: Blob): 'image' | 'video' | 'other' {
  const mimeType = blob.type // Get the MIME type from the Blob

  if (mimeType.startsWith('image/')) {
    return 'image' // It's an image
  } else if (mimeType.startsWith('video/')) {
    return 'video' // It's a video
  } else {
    return 'other' // Something else
  }
}
