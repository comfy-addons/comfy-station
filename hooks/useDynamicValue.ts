import { useCallback, useEffect, useState } from 'react'

/**
 * Make dynamic value base on client screen status
 * @param breakPoints Array of pixel values defining the breakpoints [small/medium, medium/large, large/xlarge?]
 * @param mode Dimension to check against breakpoints ('width' or 'height')
 * @returns Function that returns appropriate value based on current screen size
 */
export const useDynamicValue = (
  breakPoints: [number, number] | [number, number, number] = [720, 960],
  mode: 'width' | 'height' = 'width',
  ref?: React.RefObject<HTMLDivElement | null>
): (<T = undefined>(values: [T, T, T] | [T, T, T, T], fallBack?: T) => T) => {
  const [sel, setSel] = useState(-1)

  const handleResize = useCallback(() => {
    const ele = ref?.current ?? document.documentElement
    const currentSize = mode === 'width' ? ele.clientWidth : ele.clientHeight
    const thirdBreakpoint = breakPoints[2] ?? breakPoints[1]

    if (currentSize > thirdBreakpoint) {
      setSel(3)
    } else if (currentSize > breakPoints[1]) {
      setSel(2)
    } else if (currentSize > breakPoints[0]) {
      setSel(1)
    } else {
      setSel(0)
    }
  }, [breakPoints, mode, ref])

  useEffect(() => {
    handleResize()
    window.addEventListener('resize', handleResize)
    return (): void => window.removeEventListener('resize', handleResize)
  }, [handleResize])

  /**
   * Return size base on screen status
   * @param values [small, medium, large] or [small, medium, large, xlarge] dynamic values to be used
   * @param fallBack Default value to use if selection is not yet determined
   */
  const getValue = <T = undefined>(values: [T, T, T] | [T, T, T, T], fallBack?: T): T => {
    if (sel === -1) {
      return fallBack !== undefined ? fallBack : values[0]
    }
    // If no fourth value provided, use the third value for both large and xlarge cases
    if (sel === 3 && values.length === 3) {
      return values[2]
    }
    return values[sel]
  }

  return getValue
}
