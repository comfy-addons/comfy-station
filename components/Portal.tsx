/* eslint-disable react-hooks/exhaustive-deps */
/* Portal handle for popup or when you need put your component on top of app */

import { getWindowRelativeOffset } from '@/utils/tools'
import React, { RefObject, useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const PORTAL_ROOT_ID = 'portal-root'
const FORCE_RECALCULATE_KEY = 'FORCE_RECALCULATE_KEY'

/**
 * Portal for popup element
 */
export const Portal: IComponent<{
  /**
   * Disabled portal, render children directly
   */
  disabled?: boolean
  /**
   * Enabled follow scroll, portal will follow scroll of window, require more performance (DEFAULT false)
   */
  followScroll?: boolean
  /**
   * FPS update portal when scroll (DEFAULT 60)
   */
  fpsScroll?: number
  /**
   * Whether user can interact with children inside or not
   */
  interactive?: boolean
  /**
   * Cast dark overlay on top of portal
   */
  castOverlay?: boolean

  /**
   * Wrapper around children
   */
  wrapperCls?: string
  /**
   * ID of container to portal to, Default to body tag
   */
  to?: RefObject<HTMLDivElement | null>
  /**
   * Target of parent object,
   * size and position of portal will be follow this target
   */
  target?: RefObject<HTMLDivElement | HTMLSpanElement | null>
  /**
   * Scrollable element that contain this portal (DEFAULT `body`)
   */
  scrollElement?: RefObject<HTMLDivElement | HTMLSpanElement | null>
}> = ({
  to,
  disabled,
  children,
  target,
  wrapperCls,
  followScroll = false,
  scrollElement = null,
  interactive = true,
  castOverlay
}) => {
  const portalID = useId()
  const targetRef = useRef(target?.current)
  const containerRef = useRef<null | HTMLDivElement | HTMLBodyElement>(to?.current)

  const cloneEleRef = useRef<HTMLDivElement | null>(null)
  const portalContainerRef = useRef<HTMLDivElement | HTMLBodyElement | null>(null)

  const [result, setResult] = useState(<div />)

  const childrenWrapper = interactive ? (
    <div className={wrapperCls} style={{ pointerEvents: 'visible' }}>
      {children}
    </div>
  ) : (
    children
  )

  useEffect(() => {
    if (to?.current) {
      const ele = to.current.querySelector(`#${PORTAL_ROOT_ID}`)
      portalContainerRef.current = ele as HTMLDivElement
    } else {
      portalContainerRef.current = document.getElementById(PORTAL_ROOT_ID) as HTMLDivElement
    }
    // Create portal root if not exist
    if (!portalContainerRef.current) {
      const portalRoot = document.createElement('div')
      portalRoot.id = PORTAL_ROOT_ID
      portalRoot.style.position = 'fixed'
      portalRoot.style.width = '100%'
      portalRoot.style.height = '100%'
      portalRoot.style.top = '0'
      portalRoot.style.left = '0'
      portalRoot.style.zIndex = '9999'
      portalRoot.style.pointerEvents = 'none'

      if (to?.current) {
        to.current.appendChild(portalRoot)
      } else {
        document.getElementsByTagName('body')[0].appendChild(portalRoot)
      }
      portalContainerRef.current = portalRoot
    }

    // Create portal element
    if (!cloneEleRef.current) {
      const bootstrapDiv = document.createElement('div')
      bootstrapDiv.id = portalID
      bootstrapDiv.style.display = 'flex'
      cloneEleRef.current = bootstrapDiv
    }

    setResult(createPortal(childrenWrapper, cloneEleRef.current))
  }, [])

  const reCalculate = useCallback(() => {
    if (target?.current) {
      targetRef.current = target.current
    }
    /**
     * Set to new position on mouse scroll (WORKAROUND)
     * TODO: Optimize this some day, use relative offset for avoid re-calculating
     */

    /* Bind your component into portal, place on top of app */
    if (targetRef?.current && cloneEleRef.current && containerRef.current) {
      const top = window.scrollY || document.documentElement.scrollTop
      const left = window.scrollX || document.documentElement.scrollLeft
      cloneEleRef.current.style.width = targetRef.current.offsetWidth
        ? `${targetRef.current.offsetWidth}px`
        : targetRef.current.style.width
      cloneEleRef.current.style.height = targetRef.current.offsetHeight
        ? `${targetRef.current.offsetHeight}px`
        : targetRef.current.style.height
      const offset = getWindowRelativeOffset(scrollElement?.current || containerRef.current, targetRef.current)

      // Set new position
      cloneEleRef.current.style.left = `${offset.left + left}px`
      cloneEleRef.current.style.top = `${offset.top - top}px`
      cloneEleRef.current.style.pointerEvents = 'none'
      cloneEleRef.current.style.position = 'absolute'
    }
  }, [])

  useEffect((): (() => void) | void => {
    /* Bind your component into portal, place on top of app */
    if (!target) {
      if (to?.current) {
        targetRef.current = to.current
      } else {
        targetRef.current = document.getElementsByTagName('body')[0]
      }
    }
    reCalculate()
    if (portalContainerRef.current && cloneEleRef.current) {
      portalContainerRef.current.appendChild(cloneEleRef.current)
      return () => {
        if (cloneEleRef.current) {
          portalContainerRef.current?.removeChild(cloneEleRef.current)
        }
      }
    }
  }, [cloneEleRef, portalContainerRef, target, containerRef, scrollElement])

  useEffect(() => {
    if (!containerRef.current) {
      if (to?.current) {
        containerRef.current = to.current
      } else {
        containerRef.current = document.getElementsByTagName('body')[0]
      }
    }
    reCalculate()
    if (!disabled) {
      if (followScroll) {
        window.addEventListener('scroll', reCalculate, true)
      }
      window.addEventListener('resize', reCalculate)
    }
    window.addEventListener(FORCE_RECALCULATE_KEY, reCalculate)
    return () => {
      window.removeEventListener('scroll', reCalculate)
      window.removeEventListener('resize', reCalculate)
      window.removeEventListener(FORCE_RECALCULATE_KEY, reCalculate)
    }
  }, [disabled])

  useEffect((): void => {
    if (cloneEleRef.current) {
      setResult(createPortal(childrenWrapper, cloneEleRef.current))
    }
  }, [children])

  useEffect(() => {
    if (!portalContainerRef.current) return
    if (!castOverlay) return
    if (!disabled) {
      portalContainerRef.current.style.backgroundColor = 'rgba(0,0,0,0.5)'
    } else {
      portalContainerRef.current.style.backgroundColor = 'transparent'
    }
  }, [disabled, castOverlay])

  if (disabled) return children
  return result
}

/**
 * Listen on portal recalculate event
 * @param callback Callback when update portal
 */
export const onRecalculatePortalEvent = (callback: () => void): void => {
  window?.addEventListener(FORCE_RECALCULATE_KEY, callback)
}

/**
 * Remove listener of portal update's event
 * @param callback Callback when portal update
 */
export const removeRecalculatePortalEvent = (callback: () => void): void => {
  window?.removeEventListener(FORCE_RECALCULATE_KEY, callback)
}

/**
 * Call portal to re-calculate position
 */
export const forceRecalculatePortal = (): void => {
  window?.dispatchEvent(new Event(FORCE_RECALCULATE_KEY))
}
