import { useState } from 'react'
import { useWindowResize } from './useWindowResize'

const useMobile = (initialize: boolean | null = false) => {
  const [isMobile, setIsMobile] = useState<boolean | null>(initialize)

  useWindowResize(() => {
    setIsMobile(window.innerWidth <= 768)
  })

  return isMobile
}

export default useMobile
