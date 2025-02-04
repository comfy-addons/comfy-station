import { useState, useCallback } from 'react'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

/**
 * Result type for the useFileBundler hook
 */
interface UseFileBundlerResult {
  /** Function to bundle and download multiple files as a zip file */
  bundleFiles: (fileUrls: string[]) => Promise<void>
  /** Indicates if a bundling operation is in progress */
  isLoading: boolean
  /** Error message if the bundling operation failed */
  error: string | null
  /** Download progress percentage (0-100) */
  progress: number
}

/**
 * Hook for bundling multiple files into a downloadable zip file
 *
 * Features:
 * - Downloads multiple files in parallel
 * - Shows download progress
 * - Automatically handles single file downloads
 * - Provides error handling
 *
 * @returns Object containing bundling function and status information
 *
 * @example
 * const { bundleFiles, isLoading, error, progress } = useFileBundler();
 *
 * // Download multiple files
 * await bundleFiles(['url1.jpg', 'url2.jpg']);
 *
 * // Single file will open in new tab
 * await bundleFiles(['single-file.jpg']);
 */
const useFileBundler = (): UseFileBundlerResult => {
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<number>(0)

  const downloadFile = useCallback(async (url: string, onProgress: (progress: number) => void): Promise<Blob> => {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to download file: ${url} (${response.status})`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('Response body is not readable')

      const contentLength = Number(response.headers.get('Content-Length')) || 0
      let loaded = 0
      const chunks: Uint8Array[] = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
        loaded += value.length
        onProgress(contentLength ? (loaded / contentLength) * 100 : 0)
      }

      return new Blob(chunks)
    } catch (error) {
      throw new Error(`Download failed for ${url}: ${(error as Error).message}`)
    }
  }, [])

  const bundleFiles = useCallback(
    async (fileUrls: string[]): Promise<void> => {
      if (fileUrls.length === 0) {
        setError('No files to bundle')
        return
      }

      if (fileUrls.length === 1) {
        window.open(fileUrls[0], '_blank')
        return
      }

      setIsLoading(true)
      setError(null)
      setProgress(0)

      try {
        const zip = new JSZip()
        const totalFiles = fileUrls.length
        const percents = new Array(totalFiles).fill(0)

        await Promise.all(
          fileUrls.map(async (url, idx) => {
            try {
              const fileName = url.split('/').pop()?.split('?')[0] || `file-${idx + 1}`
              const fileBlob = await downloadFile(url, (fileProgress) => {
                percents[idx] = fileProgress
                const totalProgress = percents.reduce((acc, cur) => acc + cur, 0) / totalFiles
                setProgress(Math.min(Math.round(totalProgress), 100))
              })
              zip.file(fileName, fileBlob)
            } catch (error) {
              throw new Error(`Failed to process ${url}: ${(error as Error).message}`)
            }
          })
        )

        const zipBlob = await zip.generateAsync({
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 }
        })

        saveAs(zipBlob, 'files.zip')
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setIsLoading(false)
        setProgress(0)
      }
    },
    [downloadFile]
  )

  return { bundleFiles, isLoading, error, progress }
}

export default useFileBundler
