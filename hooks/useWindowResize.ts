import { useEffect } from 'react'

/**
 * Trigger function when window is resized
 */
const useWindowResize = (onResize: () => void, warmup = true): void => {
  useEffect(() => {
    // Trigger one after mount
    if (warmup) {
      onResize()
    }

    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
    }
  }, [onResize, warmup])
}

export { useWindowResize }
