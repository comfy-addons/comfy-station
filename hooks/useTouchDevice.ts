import { useState, useEffect } from 'react'

// Detect if the user is using a touch device
export const useTouchDevice = () => {
  const [isTouchDevice, setIsTouchDevice] = useState<boolean | null>(null)

  useEffect(() => {
    const handleTouch = () => {
      setIsTouchDevice(true)
    }

    const handleMouse = () => {
      setIsTouchDevice(false)
    }

    handleTouch() // Check on mount
    window.addEventListener('touchstart', handleTouch)
    window.addEventListener('mousemove', handleMouse)

    return () => {
      window.removeEventListener('touchstart', handleTouch)
      window.removeEventListener('mousemove', handleMouse)
    }
  }, [])

  return isTouchDevice
}
