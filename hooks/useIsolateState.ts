import { useEffect, useId } from 'react'

/**
 * A custom React hook that provides isolated state management through custom events.
 * This hook allows components to communicate state changes without direct prop drilling or context.
 *
 * @template T - Type of the state object, must be a Record with string keys
 * @param onStateChange - Callback function that will be called when the state changes
 * @returns A function to set the isolated state
 *
 * @example
 * ```typescript
 * const setState = useIsolateState<{ count: number }>((state) => {
 *   console.log('New state:', state.count);
 * });
 *
 * // Later in your code
 * setState({ count: 5 });
 * ```
 */
export const useIsolateState = <T extends Record<string, any>>(onStateChange: (state: T) => void) => {
  const id = useId()

  const setState = (state: T) => {
    window.dispatchEvent(new CustomEvent(id, { detail: state }))
  }

  useEffect(() => {
    const fn = (e: CustomEvent) => {
      onStateChange(e.detail)
    }
    window.addEventListener(id, fn as any)
    return () => {
      window.removeEventListener(id, fn as any)
    }
  }, [id, onStateChange])

  return setState
}
