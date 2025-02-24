import { delay } from '@/utils/tools'
import { useState, useCallback, useRef, useEffect } from 'react'

const useActionThreshold = (
  threshold = 500, // Delay between calls
  once = false // Only trigger once if true
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
        console.error('Action execution failed:', error)
      } finally {
        if (once) return
        await delay(threshold)
        if (isMounted.current) setReady(true)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [once, threshold]
  )

  const refresh = useCallback(() => {
    if (isMounted.current && !once) {
      setReady(true)
    }
  }, [once])

  return { onAction, refresh }
}

export default useActionThreshold

/**
 * Make an action that has debounce on each given time
 * @param debounceTime Delay after call
 * @param clearWhenCallAgain Renew current timeout if true
 */
const useActionDebounce = (
  debounceTime = 500,
  clearWhenCallAgain = false
): ((_action: () => Promise<void> | void) => void) => {
  const actionRef = useRef<(() => Promise<void> | void) | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clean = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    actionRef.current = null
  }, [])

  useEffect(() => {
    return clean // Cleanup function
  }, [clean])

  const doAction = useCallback(async () => {
    if (!actionRef.current) return

    try {
      await actionRef.current()
    } catch (error) {
      console.error('Debounced action execution failed:', error)
    } finally {
      clean()
    }
  }, [clean])

  const onAction = useCallback(
    (_action: () => Promise<void> | void) => {
      if (typeof _action !== 'function') {
        console.error('useActionDebounce requires a function argument')
        return
      }

      actionRef.current = _action

      if (clearWhenCallAgain && timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(doAction, debounceTime)
    },
    [clearWhenCallAgain, debounceTime, doAction]
  )

  return onAction
}

export { useActionDebounce, useActionThreshold }
