import { useEffect, useCallback } from 'react'

/**
 * Hook that handles window resize events with optional initial trigger
 *
 * @param onResize - Callback function to execute when window is resized
 * @param warmup - Whether to trigger the callback once after mount (default: true)
 *
 * @example
 * // Basic usage
 * useWindowResize(() => {
 *   console.log('Window size:', window.innerWidth, window.innerHeight);
 * });
 *
 * // Without initial trigger
 * useWindowResize(() => {
 *   updateLayout();
 * }, false);
 *
 * // With debounced callback
 * const debouncedCallback = useMemo(
 *   () => debounce(() => handleResize(), 100),
 *   []
 * );
 * useWindowResize(debouncedCallback);
 */
const useWindowResize = (onResize: () => void, warmup = true): void => {
  const handleResize = useCallback(() => {
    if (typeof window !== 'undefined') {
      onResize()
    }
  }, [onResize])

  useEffect(() => {
    if (warmup) {
      handleResize()
    }

    window.addEventListener('resize', handleResize, { passive: true })
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [handleResize, warmup])
}

export { useWindowResize }
