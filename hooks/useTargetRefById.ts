import { useEffect, useRef } from 'react'

/**
 * Hook that returns a reference to a DOM element by its ID
 * @param elementId - The ID of the element to target
 * @returns RefObject containing the targeted DOM element or null if not found
 */
export const useTargetRefById = <T = HTMLElement>(elementId: string) => {
  const elementRef = useRef<T | null>(null)

  useEffect(() => {
    // Get the element when the component mounts or elementId changes
    const targetElement = document.getElementById(elementId) as T
    elementRef.current = targetElement

    // No cleanup needed as we're just storing a reference
  }, [elementId])

  return elementRef
}
