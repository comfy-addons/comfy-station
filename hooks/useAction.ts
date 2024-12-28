import { delay } from '@/utils/tools'
import { useState, useCallback, useRef, useId } from 'react'

/**
 * Collections of timeoutID for debounceHook
 */
const timeoutIDs: Record<string, ReturnType<typeof setTimeout> | null> = {}

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

  const onAction = useCallback(
    async (action: () => Promise<void> | void): Promise<void> => {
      if (!ready) {
        return
      }
      setReady(false)
      try {
        await action()
      } catch (error) {
        setReady(true)
        throw error
      } finally {
        if (once) {
          return
        }
        await delay(threshold)
        setReady(true)
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
  const id = useId()
  const action = useRef<Function | null>(null)

  const clean = useCallback(() => {
    const timeOut = timeoutIDs[id]
    if (timeOut) {
      clearTimeout(timeOut)
      delete timeoutIDs[id]
    }
    action.current = null
  }, [id])

  const doAction = useCallback(async (): Promise<void> => {
    if (typeof action.current === 'function') {
      try {
        await action.current()
      } catch (error) {
        console.error('Action execution failed:', error)
      }
    }
    clean()
  }, [clean])

  const onAction = useCallback(
    (_action: () => Promise<void> | void = async (): Promise<void> => undefined): void => {
      action.current = _action
      const timeOut = timeoutIDs[id]

      if (clearWhenCallAgain && timeOut) {
        clearTimeout(timeOut)
      }

      if (clearWhenCallAgain || timeoutIDs[id] === null) {
        timeoutIDs[id] = setTimeout(() => doAction(), debounceTime)
      }
    },
    [id, clearWhenCallAgain, debounceTime, doAction]
  )

  useCallback(() => {
    return () => clean()
  }, [clean])

  return onAction
}

export { useActionDebounce, useActionThreshold }
