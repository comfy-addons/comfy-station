import { useState, useEffect } from 'react'

const useMobile = (initialize: boolean | null = false) => {
  const [isMobile, setIsMobile] = useState<boolean | null>(initialize)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768)
    }

    handleResize() // Check on mount
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return isMobile
}

export default useMobile
