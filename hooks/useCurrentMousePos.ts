import { useEffect, useRef } from 'react'

const useCurrentMousePosRef = (cb?: (mousePos: { x: number; y: number }) => void) => {
  const mousePos = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      mousePos.current = { x: event.clientX, y: event.clientY }
      cb?.(mousePos.current)
    }

    window.addEventListener('mousemove', handleMouseMove)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])

  return mousePos
}

export default useCurrentMousePosRef
