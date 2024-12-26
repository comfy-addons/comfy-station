/* eslint-disable react-hooks/exhaustive-deps */
/* Portal handle for popup or when you need put your component on top of app */

import { uniqueId } from 'lodash'
import React, { RefObject, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * Get element position on parent
 */
const getWindowRelativeOffset = (
  parentWindow: Element,
  elem: Element
): { left: number; top: number; right: number; bottom: number } => {
  const offset = {
    left: 0,
    top: 0,
    right: 0,
    bottom: 0
  }
  // relative to the target field's document
  const childPos = elem.getBoundingClientRect()
  const parentPos = parentWindow.getBoundingClientRect()

  offset.top = childPos.top - parentPos.top
  offset.right = childPos.right - parentPos.right
  offset.bottom = childPos.bottom - parentPos.bottom
  offset.left = childPos.left - parentPos.left

  return offset
}

const FORCE_RECALCULATE_KEY = 'FORCE_RECALCULATE_KEY'

/**
 * Portal for popup element
 */
export const Portal: IComponent<{
  /**
   * ID of container to portal to, Default to body tag
   */
  to?: string
  disabled?: boolean
  /**
   * Target of parent object
   */
  target?: RefObject<HTMLDivElement | HTMLSpanElement | null>

  /**
   * Scrollable element that contain this portal (DEFAULT `body`)
   */
  scrollElement?: RefObject<HTMLDivElement | HTMLSpanElement | null>
  /**
   * Enabled follow scroll
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
  castOverlay?: boolean
}> = ({
  to,
  disabled,
  children,
  target,
  followScroll = true,
  scrollElement = null,
  interactive = true,
  castOverlay
}) => {
  const container = useRef<null | HTMLDivElement | HTMLBodyElement>(null)
  const ref = useRef(target?.current)
  const [portalID] = useState(uniqueId('portal'))
  const mount = useRef<HTMLDivElement | null>(null)
  const el = useRef<HTMLDivElement | null>(null)
  const [result, setResult] = useState(<div />)

  const childrenWrapper = interactive ? <div style={{ pointerEvents: 'visible' }}>{children}</div> : children

  useEffect(() => {
    /* Prevent bug on nextJS, we will call document after rendered */
    mount.current = document.getElementById(to ? `${to}-portal-root` : 'portal-root') as HTMLDivElement
    if (!mount.current) {
      const portalRoot = document.createElement('div')
      portalRoot.id = to ? `${to}-portal-root` : 'portal-root'
      if (interactive === false) {
        portalRoot.style.pointerEvents = 'none'
      }
      switch (typeof to) {
        case 'string': {
          const targetElement = document.getElementById(to)
          if (targetElement) {
            targetElement.appendChild(portalRoot)
            break
          }
        }
        default: {
          document.getElementsByTagName('body')[0].appendChild(portalRoot)
        }
      }
      mount.current = portalRoot
    }
    if (!el.current) {
      const bootstrapDiv = document.createElement('div')
      bootstrapDiv.id = portalID
      el.current = bootstrapDiv
    }
    setResult(createPortal(childrenWrapper, el.current))
  }, [])

  const reCalculate = () => {
    if (target?.current) {
      ref.current = target.current
    }
    if (followScroll) {
      /**
       * Set to new position on mouse scroll (WORKAROUND)
       * TODO: Optimize this some day, use relative offset for avoid re-calculating
       */
      const top = window.pageYOffset || document.documentElement.scrollTop
      const left = window.pageXOffset || document.documentElement.scrollLeft
      /* Bind your component into portal, place on top of app */
      if (ref?.current && el.current && container.current) {
        el.current.style.width = ref.current.offsetWidth ? `${ref.current.offsetWidth}px` : ref.current.style.width
        el.current.style.height = ref.current.offsetHeight ? `${ref.current.offsetHeight}px` : ref.current.style.height
        const offset = getWindowRelativeOffset(scrollElement?.current || container.current, ref.current)
        const ele = document.getElementById(portalID)
        if (ele) {
          ele.style.left = `${offset.left + left}px`
          ele.style.top = `${offset.top - top}px`
          ele.style.pointerEvents = 'none'
          ele.style.position = 'absolute'
        }
      }
    }
  }

  useEffect((): (() => void) | void => {
    /* Bind your component into portal, place on top of app */
    if (!target) {
      switch (typeof to) {
        case 'string': {
          const targetElement = document.getElementById(to)
          if (targetElement) {
            ref.current = targetElement
            break
          }
        }
        default: {
          ref.current = document.getElementsByTagName('body')[0]
        }
      }
    }
    if (ref?.current && el.current && container.current) {
      const offset = getWindowRelativeOffset(scrollElement?.current || container.current, ref.current)
      el.current.style.position = 'absolute'
      el.current.style.width = ref.current.offsetWidth ? `${ref.current.offsetWidth}px` : ref.current.style.width
      el.current.style.height = ref.current.offsetHeight ? `${ref.current.offsetHeight}px` : ref.current.style.height
      el.current.style.left = `${offset.left}px`
      el.current.style.top = `${offset.top + window.scrollY}px`
      el.current.style.pointerEvents = 'none'
    }
    if (mount.current && el.current) {
      mount.current.appendChild(el.current)
      return () => {
        if (el.current) {
          mount.current?.removeChild(el.current)
        }
      }
    }
  }, [el, mount, target, container, scrollElement])

  useEffect(() => {
    if (!container.current) {
      switch (typeof to) {
        case 'string': {
          const targetElement = document.getElementById(to)
          if (targetElement) {
            container.current = targetElement as HTMLDivElement
            break
          }
        }
        default: {
          container.current = document.getElementsByTagName('body')[0]
        }
      }
    }
    window.addEventListener('scroll', reCalculate, true)
    window.addEventListener('resize', reCalculate)
    window.addEventListener(FORCE_RECALCULATE_KEY, reCalculate)
    return () => {
      window.removeEventListener('scroll', reCalculate)
      window.removeEventListener('resize', reCalculate)
      window.removeEventListener(FORCE_RECALCULATE_KEY, reCalculate)
    }
  }, [])

  useEffect((): void => {
    if (el.current) {
      setResult(createPortal(childrenWrapper, el.current))
    }
  }, [children])

  useEffect(() => {
    if (!container.current) return
    if (!castOverlay) return
    if (!disabled) {
      container.current.style.backgroundColor = 'rgba(0,0,0,0.5)'
    } else {
      container.current.style.backgroundColor = 'transparent'
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
