import { useState, useCallback } from 'react'
import { saveAs } from 'file-saver'
import JSZip from 'jszip'

interface UseFileBundlerResult {
  bundleFiles: (fileUrls: string[]) => Promise<void>
  isLoading: boolean
  error: string | null
  progress: number
}

const sanitizeFileName = (fileName: string, index = Date.now()): string => {
  return fileName.replace(/[<>:"/\\|?*]+/g, '_') || `file-${index + 1}`
}

const useFileBundler = (): UseFileBundlerResult => {
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<number>(0)

  const downloadFile = useCallback(
    async (url: string, onProgress: (progress: number) => void): Promise<{ name: string; blob: Blob } | null> => {
      try {
        const response = await fetch(url)
        if (!response.ok) throw new Error(`Failed to download: ${response.status} (${response.statusText})`)

        const reader = response.body?.getReader()
        if (!reader) throw new Error('Unable to read response body')

        const contentLength = Number(response.headers.get('Content-Length')) || 0
        let loaded = 0
        const chunks: Uint8Array[] = []

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          chunks.push(value)
          loaded += value.length
          onProgress(contentLength ? (loaded / contentLength) * 100 : Math.random() * 5) // Fallback progress
        }

        return {
          name: sanitizeFileName(url.split('/').pop()?.split('?')[0] || `file-${Date.now()}`),
          blob: new Blob(chunks)
        }
      } catch (error) {
        console.error(`Download failed for ${url}: ${(error as Error).message}`)
        return null
      }
    },
    []
  )

  const bundleFiles = useCallback(
    async (fileUrls: string[]): Promise<void> => {
      if (fileUrls.length === 0) {
        setError('No files to bundle')
        return
      }

      if (fileUrls.length === 1) {
        const newTab = window.open(fileUrls[0], '_blank')
        setTimeout(() => newTab?.close(), 5000)
        return
      }

      setIsLoading(true)
      setError(null)
      setProgress(0)

      try {
        const zip = new JSZip()
        const totalFiles = fileUrls.length
        const percents = new Array(totalFiles).fill(0)
        const failedFiles: string[] = []

        const files = await Promise.all(
          fileUrls.map(async (url, idx) => {
            const file = await downloadFile(url, (fileProgress) => {
              percents[idx] = fileProgress
              const totalProgress = percents.reduce((acc, cur) => acc + cur, 0) / totalFiles
              setProgress(Math.min(Math.round(totalProgress), 99)) // Prevent instant jump to 100%
            })

            if (!file) failedFiles.push(url)
            return file
          })
        )

        const validFiles = files.filter((file): file is { name: string; blob: Blob } => file !== null)
        if (validFiles.length === 0) throw new Error('All files failed to download.')

        // Log files before zipping
        console.log(
          'Files to zip:',
          validFiles.map((f) => f.name)
        )

        validFiles.forEach(({ name, blob }) => {
          zip.file(name, blob)
        })

        // Ensure ZIP progress is tracked
        setProgress(99)
        const zipBlob = await zip.generateAsync({
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 },
          streamFiles: true
        })

        setProgress(100)
        saveAs(zipBlob, 'files.zip')

        if (failedFiles.length > 0) {
          setError(`Some files failed: ${failedFiles.join(', ')}`)
        }
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
