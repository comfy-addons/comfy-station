import { useState, useEffect, MouseEvent } from 'react'

const useClickEvent = (
  actionSimpleClick?: (e: MouseEvent) => void,
  actionDoubleClick?: (e: MouseEvent) => void,
  delay = 250
) => {
  const [state, setState] = useState<{ click: number; e: MouseEvent | null }>({ click: 0, e: null })

  useEffect(() => {
    const timer = setTimeout(() => {
      // simple click
      if (state.click === 1) actionSimpleClick?.(state.e!)
      setState({ e: state.e, click: 0 })
    }, delay)

    // the duration between this click and the previous one
    // is less than the value of delay = double-click
    if (state.click === 2) actionDoubleClick?.(state.e!)

    return () => clearTimeout(timer)
  }, [state, actionSimpleClick, actionDoubleClick, delay])

  return (e: MouseEvent) => {
    setState({ click: state.click + 1, e })
  }
}

export default useClickEvent
