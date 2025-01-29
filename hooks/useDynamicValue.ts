import { useCallback, useEffect, useState } from 'react'

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

  const handleResize = useCallback(() => {
    // Get element dimensions
    const ele = ref?.current ?? document.documentElement
    const currentSize = mode === 'width' ? ele.offsetWidth : ele.offsetHeight

    // Determine breakpoint index
    if (breakPoints[2]) {
      if (currentSize > breakPoints[2]) setSel(3)
      else if (currentSize > breakPoints[1]) setSel(2)
      else if (currentSize > breakPoints[0]) setSel(1)
      else setSel(0)
    } else {
      if (currentSize > breakPoints[1]) setSel(2)
      else if (currentSize > breakPoints[0]) setSel(1)
      else setSel(0)
    }
  }, [breakPoints, mode, ref])

  useEffect(() => {
    // Initial resize check
    handleResize()

    // Add resize event listener
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [handleResize])

  /**
   * Get value based on current breakpoint selection
   * @param values Array of values for each breakpoint
   * @param fallBack Default value to use if selection is not determined
   */
  const getValue = <T = undefined>(values: T[], fallBack?: T): T => {
    // Handle initial state
    if (sel === -1) return fallBack ?? values[0]

    // Ensure we don't exceed array bounds
    const finalSel = Math.min(sel, values.length - 1)

    return values[finalSel]
  }

  return getValue
}
