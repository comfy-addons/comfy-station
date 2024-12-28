import { useState, useCallback } from 'react'
import { useToast } from './useToast'

/**
 * Custom hook that provides a function to copy text to the clipboard and show a notification.
 */
const useCopyAction = () => {
  const { toast } = useToast()
  const [isCopied, setIsCopied] = useState(false)

  /**
   * Copies the provided text to the clipboard and shows a notification.
   * @param {string} text - The text to be copied to the clipboard.
   */
  const copyToClipboard = useCallback(
    (text: string, toastStr?: string) => {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          setIsCopied(true)
          if (toast) {
            toast({
              title: toastStr
            })
          }
          setTimeout(() => setIsCopied(false), 2000) // Reset the copied state after 2 seconds
        })
        .catch((err) => {
          console.error('Failed to copy text: ', err)
        })
    },
    [toast]
  )

  return { copyToClipboard, isCopied }
}

export default useCopyAction
