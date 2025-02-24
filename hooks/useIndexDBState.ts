import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Configuration for IndexedDB
 */
const DB_CONFIG = {
  name: 'myDatabase',
  store: 'myStore',
  version: 1
} as const

let dbInstance: IDBDatabase | null = null // Cached DB connection

/**
 * Opens or creates an IndexedDB database connection
 * @returns Promise resolving to IDBDatabase instance
 */
const openDB = (): Promise<IDBDatabase> => {
  if (dbInstance) return Promise.resolve(dbInstance)

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(DB_CONFIG.store)) {
        db.createObjectStore(DB_CONFIG.store)
      }
    }

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result
      resolve(dbInstance)
    }

    request.onerror = (event) => reject((event.target as IDBOpenDBRequest).error)
  })
}

/**
 * Retrieves data from IndexedDB
 * @param key - Key to retrieve data for
 * @returns Promise resolving to stored value
 */
const getData = async <T>(key: string, defaultValue: T): Promise<T> => {
  try {
    const db = await openDB()
    return new Promise<T>((resolve, reject) => {
      const transaction = db.transaction([DB_CONFIG.store], 'readonly')
      const store = transaction.objectStore(DB_CONFIG.store)
      const request = store.get(key)

      request.onsuccess = (event) => {
        resolve((event.target as IDBRequest).result ?? defaultValue) // Return default value if key not found
      }

      request.onerror = (event) => reject((event.target as IDBRequest).error)
    })
  } catch (error) {
    console.error('Error retrieving data:', error)
    return defaultValue
  }
}

/**
 * Stores data in IndexedDB
 * @param key - Key to store data under
 * @param value - Value to store
 */
const setData = async <T>(key: string, value: T): Promise<void> => {
  try {
    const db = await openDB()
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([DB_CONFIG.store], 'readwrite')
      const store = transaction.objectStore(DB_CONFIG.store)
      const request = store.put(value, key)

      request.onsuccess = () => resolve()
      request.onerror = (event) => reject((event.target as IDBRequest).error)
    })
  } catch (error) {
    console.error('Error saving data:', error)
  }
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
  const [state, setState] = useState<T>(initialValue)
  const isLoading = useRef(true) // Ref to track loading state

  useEffect(() => {
    let mounted = true
    isLoading.current = true

    getData<T>(key, initialValue)
      .then((storedValue) => {
        if (mounted) {
          setState(storedValue)
        }
      })
      .catch((error) => {
        console.error('Error loading from IndexedDB:', error)
      })
      .finally(() => {
        if (mounted) isLoading.current = false
      })

    return () => {
      mounted = false
    }
  }, [key, initialValue])

  const setStoredState = useCallback(
    (value: T | ((prevValue: T) => T)) => {
      if (isLoading.current) return // Prevent setting state while loading

      setState((prevState) => {
        const newValue = typeof value === 'function' ? (value as (prevValue: T) => T)(prevState) : value

        setData(key, newValue).catch((error) => console.error('Error saving to IndexedDB:', error))

        return newValue
      })
    },
    [key]
  )

  return [state, setStoredState]
}

export { useIndexDBState }
