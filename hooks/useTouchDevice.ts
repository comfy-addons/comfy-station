import { useState, useEffect } from 'react'

/**
 * useIsTouchDevice - A hook to detect if the user is on a touch device
 *
 * @returns {boolean} `true` if the user is on a touch device, `false` otherwise
 */
export const useTouchDevice = () => {
  const [isTouchDevice, setIsTouchDevice] = useState(false)

  useEffect(() => {
    // Function to check if the device supports touch
    const checkTouchDevice = () => {
      return (
        'ontouchstart' in window || // Most modern devices
        navigator.maxTouchPoints > 0 // For Windows devices
      )
    }

    // Update the state
    setIsTouchDevice(checkTouchDevice())

    // Clean up any potential effects in the future
    return () => {
      setIsTouchDevice(false) // Reset in case of unmount or reuse
    }
  }, []) // Run only once on mount

  return isTouchDevice
}
