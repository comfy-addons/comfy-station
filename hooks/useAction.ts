import { delay } from '@/utils/tools'
import { useState, useCallback, useRef, useId, useEffect } from 'react'

/**
 * Make an action that limits calling after threshold time
 */
const useActionThreshold = (
  /**
   * Delay between calls
   */
  threshold = 500,
  /**
   * Only trigger once if true
   */
  once = false
): {
  onAction: (action: () => Promise<void> | void) => Promise<void>
  refresh: () => void
} => {
  const [ready, setReady] = useState(true)
  const isMounted = useRef(true)

  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  const onAction = useCallback(
    async (action: () => Promise<void> | void): Promise<void> => {
      if (!ready) return

      setReady(false)
      try {
        await action()
      } catch (error) {
        if (isMounted.current) setReady(true)
        throw error
      } finally {
        if (once) return
        await delay(threshold)
        if (isMounted.current) setReady(true)
      }
    },
    [ready, once, threshold]
  )

  const refresh = useCallback((): void => setReady(true), [])

  return { onAction, refresh }
}

/**
 * Make an action that has debounce on each given time
 * @param debounceTime Delay after call
 * @param clearWhenCallAgain Renew current timeout if true
 */
const useActionDebounce = (
  debounceTime = 500,
  clearWhenCallAgain = false
): ((_action: () => Promise<void> | void) => void) => {
  const actionRef = useRef<Function | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clean = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    actionRef.current = null
  }, [])

  useEffect(() => {
    return clean
  }, [clean])

  const doAction = useCallback(async (): Promise<void> => {
    if (typeof actionRef.current === 'function') {
      try {
        await actionRef.current()
      } catch (error) {
        console.error('Action execution failed:', error)
      }
    }
    clean()
  }, [clean])

  const onAction = useCallback(
    (_action: () => Promise<void> | void = async (): Promise<void> => undefined): void => {
      actionRef.current = _action

      if (clearWhenCallAgain && timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      if (clearWhenCallAgain || !timeoutRef.current) {
        timeoutRef.current = setTimeout(() => doAction(), debounceTime)
      }
    },
    [clearWhenCallAgain, debounceTime, doAction]
  )

  return onAction
}

export { useActionDebounce, useActionThreshold }
