import { useCallback, useEffect, useState, useRef } from 'react'

/**
 * Make dynamic value based on client screen status
 * @param breakPoints Array of pixel values defining the breakpoints [small/medium, medium/large]
 * @param mode Dimension to check against breakpoints ('width' or 'height')
 * @param ref Optional reference to element for size measurement
 * @returns Function that returns appropriate value based on current screen size
 */
export const useDynamicValue = (
  breakPoints: [number, number] | [number, number, number] = [720, 960],
  mode: 'width' | 'height' = 'width',
  ref?: React.RefObject<HTMLDivElement | null>
): (<T = undefined>(values: T[], fallBack?: T) => T) => {
  const [sel, setSel] = useState(-1)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)

  const handleResize = useCallback(() => {
    const ele = ref?.current ?? document.documentElement
    const currentSize = mode === 'width' ? ele.offsetWidth : ele.offsetHeight

    // Use binary search to find the appropriate breakpoint index
    const findBreakpointIndex = (size: number): number => {
      let index = 0
      for (let i = 0; i < breakPoints.length; i++) {
        if (size > breakPoints[i]) {
          index = i + 1
        }
      }
      return index
    }

    setSel(findBreakpointIndex(currentSize))
  }, [breakPoints, mode, ref])

  useEffect(() => {
    const targetElement = ref?.current ?? document.documentElement

    // Use ResizeObserver for more efficient size monitoring
    resizeObserverRef.current = new ResizeObserver(handleResize)
    resizeObserverRef.current.observe(targetElement)

    // Initial size check
    handleResize()

    return () => {
      resizeObserverRef.current?.disconnect()
    }
  }, [handleResize, ref])

  /**
   * Get value based on current breakpoint selection
   * @param values Array of values for each breakpoint
   * @param fallBack Default value to use if selection is not determined
   */
  const getValue = useCallback(<T = undefined>(values: T[], fallBack?: T): T => {
    if (sel === -1) return fallBack ?? values[0]
    return values[Math.min(sel, values.length - 1)]
  }, [sel])

  return getValue
}
