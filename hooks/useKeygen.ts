import React from 'react'

/**
 * A hook that generates unique IDs for objects using WeakMap
 * 
 * @returns An object containing the `gen` function that generates unique IDs
 * @example
 * const { gen } = useKeygen();
 * const obj1 = {};
 * const obj2 = {};
 * console.log(gen(obj1)); // "1"
 * console.log(gen(obj1)); // "1" (same ID for same object)
 * console.log(gen(obj2)); // "2"
 */
export const useKeygen = () => {
  // Store the current ID counter
  const crrId = React.useRef(1)
  // WeakMap to store object-to-id mappings without memory leaks
  const ids = React.useRef(new WeakMap<object, string>())

  /**
   * Generates or retrieves a unique ID for an object
   * @param object - The object to generate/retrieve an ID for
   * @returns A unique string ID associated with the object
   */
  const getObjectId = React.useCallback((object: object): string => {
    const existingId = ids.current.get(object)
    if (existingId) return existingId

    const newId = String(crrId.current++)
    ids.current.set(object, newId)
    return newId
  }, [])

  return { gen: getObjectId }
}
