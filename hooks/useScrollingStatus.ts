import { useRef, useEffect, useCallback } from 'react'

/**
 * Hook that tracks the scrolling status of the window
 * Returns a ref that indicates whether the user is currently scrolling
 * 
 * @param scrollDebounceOffset - Time in milliseconds to wait after the last scroll event
 *                              before considering scrolling as finished (default: 250ms)
 * @returns React.MutableRefObject<boolean> - A ref object that is true while scrolling
 * 
 * @example
 * const isScrollingRef = useScrollingStatusRef(200);
 * 
 * // Check scrolling status anywhere in your component
 * console.log('Is scrolling:', isScrollingRef.current);
 */
export const useScrollingStatusRef = (scrollDebounceOffset = 250) => {
  const isScrollingRef = useRef(false)
  const scrollTimer = useRef<Timer | null>(null)

  const handleScroll = useCallback(() => {
    isScrollingRef.current = true

    if (scrollTimer.current) {
      clearTimeout(scrollTimer.current)
    }

    scrollTimer.current = setTimeout(() => {
      isScrollingRef.current = false
    }, scrollDebounceOffset)
  }, [scrollDebounceOffset])

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (scrollTimer.current) {
        clearTimeout(scrollTimer.current)
      }
    }
  }, [handleScroll])

  return isScrollingRef
}
