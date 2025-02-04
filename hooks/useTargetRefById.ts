import { useEffect, useRef, RefObject } from 'react'

/**
 * Hook that returns a reference to a DOM element by its ID
 *
 * @template T - Type of the HTML element (defaults to HTMLElement)
 * @param elementId - The ID of the element to target
 * @returns RefObject containing the targeted DOM element or null if not found
 *
 * @example
 * // Basic usage with default HTMLElement
 * const divRef = useTargetRefById('my-div-id');
 *
 * // With specific element type
 * const inputRef = useTargetRefById<HTMLInputElement>('my-input-id');
 *
 * // Usage in JSX
 * useEffect(() => {
 *   if (divRef.current) {
 *     // Access the element
 *     divRef.current.scrollIntoView();
 *   }
 * }, []);
 */
export const useTargetRefById = <T extends HTMLElement = HTMLElement>(elementId: string): RefObject<T | null> => {
  const elementRef = useRef<T | null>(null)

  useEffect(() => {
    const targetElement = document.getElementById(elementId)
    elementRef.current = (targetElement as T) || null

    if (!targetElement && process.env.NODE_ENV === 'development') {
      console.warn(`Element with id "${elementId}" not found in the DOM`)
    }
  }, [elementId])

  return elementRef
}
