/**
 * Use State with localStorage
 */
import { cloneDeep } from 'lodash'
import { useState, useCallback } from 'react'

/**
 * Hook that syncs state with localStorage
 *
 * @template T - Type of the state value
 * @param key - localStorage key to store the state
 * @param defaultValue - Default value when localStorage is empty
 * @returns Tuple containing:
 *  - Current state value
 *  - Setter function that accepts either new value or update function, with optional filter
 *  - Function to reload value from localStorage
 *
 * @example
 * // Basic usage
 * const [value, setValue, reload] = useStorageState('my-key', 'default');
 *
 * // With update function
 * setValue(prev => prev + 1);
 *
 * // With filter function
 * setValue(newValue, obj => ({ ...obj, sensitiveField: undefined }));
 *
 * // Reload from localStorage
 * reload();
 */
export const useStorageState = <T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prevValue: T) => T), filter?: (obj: T) => T) => void, () => void] => {
  const getStoredValue = useCallback(() => {
    try {
      const storedValue = localStorage.getItem(key)
      if (storedValue === null) return defaultValue
      return JSON.parse(storedValue)
    } catch (error) {
      console.warn(`Failed to parse localStorage key "${key}":`, error)
      return defaultValue
    }
  }, [key, defaultValue])

  const [state, setState] = useState<T>(getStoredValue)

  const reloadNewValue = useCallback(() => {
    setState(getStoredValue)
  }, [getStoredValue])

  const setStoredValue = useCallback(
    (value: T | ((prevValue: T) => T), storageFilter?: (obj: T) => T) => {
      setState((prevValue) => {
        try {
          const newValue = typeof value === 'function' ? (value as (prev: T) => T)(prevValue) : value
          const filteredValue = storageFilter ? storageFilter(newValue) : newValue
          localStorage.setItem(key, JSON.stringify(filteredValue))
          return newValue
        } catch (error) {
          console.error(`Failed to save localStorage key "${key}":`, error)
          return prevValue
        }
      })
    },
    [key]
  )

  return [state, setStoredValue, reloadNewValue]
}
