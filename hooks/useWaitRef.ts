import { useEffect, useState, useCallback } from 'react'

/**
 * Hook that waits for a React ref to be populated
 *
 * This hook polls for the existence of a ref.current value and returns
 * a boolean indicating whether the ref is ready to use.
 *
 * @template T - Type of the referenced element
 * @param ref - Optional React ref object to monitor
 * @returns boolean indicating whether the ref is populated
 *
 * @example
 * const elementRef = useRef<HTMLDivElement>(null);
 * const isRefReady = useWaitRef(elementRef);
 *
 * useEffect(() => {
 *   if (isRefReady) {
 *     // Safe to use elementRef.current
 *     elementRef.current?.focus();
 *   }
 * }, [isRefReady]);
 */
export function useWaitRef<T>(ref?: React.RefObject<T>): boolean {
  const [isReady, setIsReady] = useState<boolean>(false)

  const checkRef = useCallback(() => {
    if (ref?.current) {
      setIsReady(true)
      return true
    }
    return false
  }, [ref])

  useEffect(() => {
    if (!ref) {
      setIsReady(false)
      return
    }

    // Check immediately first
    if (checkRef()) return

    const interval = setInterval(checkRef, 100)
    return () => {
      clearInterval(interval)
      setIsReady(false)
    }
  }, [ref, checkRef])

  return isReady
}
