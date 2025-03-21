import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Make dynamic value based on client screen status
 * @param breakPoints Array of pixel values defining the breakpoints [small/medium, medium/large]
 * @param mode Dimension to check against breakpoints ('width' or 'height')
 * @param ref Optional reference to element for size measurement
 * @returns Function that returns appropriate value based on current screen size
 */
export const useDynamicValue = (
  breakPoints: number[] = [720, 960],
  mode: 'width' | 'height' = 'width',
  ref?: React.RefObject<HTMLDivElement | null>
): (<T>(values: T[], fallBack?: T) => T) => {
  const [sel, setSel] = useState(-1)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)

  // Simple linear search since breakpoints are small (≤5 items)
  const findBreakpointIndex = useCallback(
    (size: number): number => {
      let index = 0
      for (let i = 0; i < breakPoints.length; i++) {
        if (size > breakPoints[i]) {
          index = i + 1
        }
      }
      return index
    },
    [breakPoints]
  )

  // Handles element resize efficiently
  const handleResize = useCallback(() => {
    const ele = ref?.current ?? document.documentElement
    const currentSize = mode === 'width' ? ele.offsetWidth : ele.offsetHeight

    const newIndex = findBreakpointIndex(currentSize)
    setSel((prev) => (prev !== newIndex ? newIndex : prev)) // Avoid unnecessary re-renders
  }, [findBreakpointIndex, mode, ref])

  useEffect(() => {
    const targetElement = ref?.current ?? document.documentElement

    // Set up ResizeObserver for efficient size tracking
    resizeObserverRef.current = new ResizeObserver(handleResize)
    resizeObserverRef.current.observe(targetElement)

    // Initial calculation
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
  const getValue = useCallback(
    <T>(values: T[], fallBack?: T): T => {
      if (sel === -1) return fallBack ?? values[0]
      return values[Math.min(sel, values.length - 1)]
    },
    [sel]
  )

  return getValue
}
