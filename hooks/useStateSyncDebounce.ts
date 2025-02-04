import { useEffect, useState, useRef } from 'react'

/**
 * Hook that provides a debounced state synchronization
 * 
 * @param relayState - The state value to be synchronized
 * @param delay - Debounce delay in milliseconds
 * @returns Tuple containing [current state value, boolean indicating if debouncing is active]
 * 
 * @example
 * const [value, setValue] = useState('initial');
 * const [debouncedValue, isDebouncing] = useStateSyncDebounce(value, 300);
 * 
 * // debouncedValue will update 300ms after value changes
 * // isDebouncing will be true during this delay
 */
const useStateSyncDebounce = <T = unknown>(relayState: T, delay: number): [T, boolean] => {
  const [state, setState] = useState<T>(relayState)
  const [debouncing, setDebouncing] = useState(false)
  const timerRef = useRef<Timer | null>(null)

  useEffect(() => {
    setDebouncing(true)

    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    timerRef.current = setTimeout(() => {
      setState(relayState)
      setDebouncing(false)
    }, delay)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [relayState, delay])

  return [state, debouncing]
}

export { useStateSyncDebounce }
