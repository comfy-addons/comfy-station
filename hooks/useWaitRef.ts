import { useEffect, useState } from 'react'

export function useWaitRef<T>(ref?: React.RefObject<T>): boolean {
  const [isReady, setIsReady] = useState(false)
  useEffect(() => {
    if (!ref) return
    const interval = setInterval(() => {
      if (ref.current) {
        setIsReady(true)
        clearInterval(interval)
      }
    }, 100)
    return () => clearInterval(interval)
  }, [ref])

  return isReady
}
