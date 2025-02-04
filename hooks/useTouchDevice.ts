import { useState, useEffect, useCallback } from 'react'

/**
 * Hook to detect if the current device supports touch input
 *
 * This hook checks multiple touch detection methods:
 * - 'ontouchstart' in window (works for most modern devices)
 * - navigator.maxTouchPoints (works for Windows touch devices)
 * - matchMedia query for coarse pointer (works for modern browsers)
 *
 * @returns boolean indicating whether the device supports touch input
 *
 * @example
 * const isTouchDevice = useTouchDevice();
 *
 * // In JSX
 * {isTouchDevice ? (
 *   <TouchInterface />
 * ) : (
 *   <MouseInterface />
 * )}
 */
export const useTouchDevice = (): boolean => {
  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(false)

  const checkTouchDevice = useCallback((): boolean => {
    if (typeof window === 'undefined') return false

    return Boolean(
      'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.matchMedia('(any-pointer: coarse)').matches
    )
  }, [])

  useEffect(() => {
    setIsTouchDevice(checkTouchDevice())

    // No need for cleanup as this is a one-time check
    // Device capabilities don't change during session
  }, [checkTouchDevice])

  return isTouchDevice
}
