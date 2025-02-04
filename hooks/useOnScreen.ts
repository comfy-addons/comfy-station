import { useEffect, useState, useRef, useCallback } from 'react'

/**
 * Hook to detect if an element is visible in the viewport
 * 
 * @param ref - React ref object pointing to the target HTML element
 * @param offset - Margin around the root element (viewport). Can be specified in pixels or percentage
 *                Format: "<top>px <right>px <bottom>px <left>px" or single value for all sides
 *                Default: '512px' (creates a 512px margin around the viewport)
 * @returns boolean indicating whether the element is visible in the viewport
 * 
 * @example
 * const elementRef = useRef<HTMLDivElement>(null);
 * const isVisible = useOnScreen(elementRef, '100px');
 * 
 * // In JSX
 * <div ref={elementRef}>
 *   {isVisible ? 'Element is visible' : 'Element is not visible'}
 * </div>
 */
export function useOnScreen(
  ref: React.RefObject<HTMLElement | null>,
  offset: string = '512px'
): boolean {
  const [isOnScreen, setIsOnScreen] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)

  const handleIntersection = useCallback(([entry]: IntersectionObserverEntry[]) => {
    setIsOnScreen(entry.isIntersecting)
  }, [])

  useEffect(() => {
    observerRef.current?.disconnect()
    observerRef.current = new IntersectionObserver(handleIntersection, {
      rootMargin: offset
    })

    if (ref.current) {
      observerRef.current.observe(ref.current)
    }

    return () => {
      observerRef.current?.disconnect()
    }
  }, [offset, handleIntersection, ref])

  return isOnScreen
}
