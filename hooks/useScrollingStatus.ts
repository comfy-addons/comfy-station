import { useState, useRef, useEffect } from 'react'

export const useScrollingStatus = () => {
  const [isScrolling, setIsScrolling] = useState(false)
  const scrollTimer = useRef<Timer | null>(null)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolling(true)

      // Clear existing timer
      if (scrollTimer.current) {
        clearTimeout(scrollTimer.current)
      }

      // Set new timer to mark scrolling as finished after 150ms of no scroll events
      scrollTimer.current = setTimeout(() => {
        setIsScrolling(false)
      }, 1000)
    }

    window.addEventListener('scroll', handleScroll, true)

    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (scrollTimer.current) {
        clearTimeout(scrollTimer.current)
      }
    }
  }, [])

  return isScrolling
}
