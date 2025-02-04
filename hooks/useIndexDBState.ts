import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Configuration for IndexedDB
 */
const DB_CONFIG = {
  name: 'myDatabase',
  store: 'myStore',
  version: 1
} as const

/**
 * Opens or creates an IndexedDB database connection
 * @returns Promise resolving to IDBDatabase instance
 */
const openDB = (): Promise<IDBDatabase> => {
  return new Promise<IDBDatabase>((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version)

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(DB_CONFIG.store)) {
          db.createObjectStore(DB_CONFIG.store)
        }
      }

      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result)
      }

      request.onerror = (event) => {
        reject((event.target as IDBOpenDBRequest).error)
      }
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Retrieves data from IndexedDB
 * @param key - Key to retrieve data for
 * @returns Promise resolving to stored value
 */
const getData = async <T>(key: string): Promise<T | undefined> => {
  const db = await openDB()
  return new Promise<T | undefined>((resolve, reject) => {
    try {
      const transaction = db.transaction([DB_CONFIG.store], 'readonly')
      const store = transaction.objectStore(DB_CONFIG.store)
      const request = store.get(key)

      request.onsuccess = (event) => {
        resolve((event.target as IDBRequest).result)
      }

      request.onerror = (event) => {
        reject((event.target as IDBRequest).error)
      }

      transaction.oncomplete = () => db.close()
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Stores data in IndexedDB
 * @param key - Key to store data under
 * @param value - Value to store
 */
const setData = async <T>(key: string, value: T): Promise<void> => {
  const db = await openDB()
  return new Promise<void>((resolve, reject) => {
    try {
      const transaction = db.transaction([DB_CONFIG.store], 'readwrite')
      const store = transaction.objectStore(DB_CONFIG.store)
      const request = store.put(value, key)

      request.onsuccess = () => resolve()
      request.onerror = (event) => reject((event.target as IDBRequest).error)
      transaction.oncomplete = () => db.close()
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Hook for managing state persistence in IndexedDB
 *
 * @template T - Type of the state value
 * @param key - Unique key to store the state under
 * @param initialValue - Initial state value
 * @returns Tuple containing current state and setter function
 *
 * @example
 * const [value, setValue] = useIndexDBState('my-key', 'initial value');
 *
 * // Update value
 * setValue('new value');
 *
 * // Update with callback
 * setValue(prev => prev + ' updated');
 */
function useIndexDBState<T>(key: string, initialValue: T): [T, (value: T | ((prevValue: T) => T)) => void] {
  const loadedRef = useRef(false)
  const [state, setState] = useState<T>(initialValue)

  useEffect(() => {
    let mounted = true
    loadedRef.current = false

    getData<T>(key)
      .then((storedValue) => {
        if (mounted && storedValue !== undefined) {
          setState(storedValue)
          loadedRef.current = true
        }
      })
      .catch((error) => {
        console.error('Error loading from IndexedDB:', error)
        loadedRef.current = true
      })

    return () => {
      mounted = false
    }
  }, [key])

  const setStoredState = useCallback(
    (value: T | ((prevValue: T) => T)) => {
      if (!loadedRef.current) return

      setState((prevState) => {
        const newValue = typeof value === 'function' ? (value as (prevValue: T) => T)(prevState) : value

        setData(key, newValue).catch((error) => {
          console.error('Error saving to IndexedDB:', error)
        })

        return newValue
      })
    },
    [key]
  )

  return [state, setStoredState]
}

export { useIndexDBState }
