import { useRef, useEffect } from 'react'

export const useScrollingStatusRef = (scrollDebounceOffset = 250) => {
  const isScrollingRef = useRef(false)
  const scrollTimer = useRef<Timer | null>(null)

  useEffect(() => {
    const handleScroll = () => {
      isScrollingRef.current = true

      // Clear existing timer
      if (scrollTimer.current) {
        clearTimeout(scrollTimer.current)
      }

      // Set new timer to mark scrolling as finished after 150ms of no scroll events
      scrollTimer.current = setTimeout(() => {
        isScrollingRef.current = false
      }, scrollDebounceOffset)
    }

    window.addEventListener('scroll', handleScroll, true)

    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (scrollTimer.current) {
        clearTimeout(scrollTimer.current)
      }
    }
  }, [])

  return isScrollingRef
}
