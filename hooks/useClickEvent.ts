import { MouseEvent, useRef } from 'react'

const useClickEvent = (
  actionSimpleClick?: (e: MouseEvent) => void,
  actionDoubleClick?: (e: MouseEvent) => void,
  delay = 250
) => {
  const clickTimeout = useRef<Timer | null>(null)
  const clickCount = useRef(0)

  return (e: MouseEvent) => {
    clickCount.current += 1

    if (clickTimeout.current) {
      clearTimeout(clickTimeout.current)
    }

    clickTimeout.current = setTimeout(() => {
      if (clickCount.current === 1) {
        actionSimpleClick?.(e)
      } else if (clickCount.current === 2) {
        actionDoubleClick?.(e)
      }
      clickCount.current = 0 // Reset after handling the click event
    }, delay)
  }
}

export default useClickEvent
