import { useEffect, useCallback } from 'react'

/**
 * Global event types for application-wide communication
 */
export enum EGlobalEvent {
  /** Trigger reload of client list */
  RLOAD_CLIENTS = 'RLOAD_CLIENTS',
  /** Trigger reload of workflow */
  RLOAD_WORKFLOW = 'RLOAD_WORKFLOW',
  /** Trigger reload of user list */
  RLOAD_USER_LIST = 'RLOAD_USER_LIST',
  /** Trigger token creation action */
  BTN_CREATE_TOKEN = 'BTN_CREATE_TOKEN'
}

/**
 * Hook to subscribe to global events
 *
 * @param eventKey - The event type to listen for
 * @param onEvent - Callback function to execute when event is triggered
 *
 * @example
 * // Listen for client reload event
 * useGlobalEvent(EGlobalEvent.RLOAD_CLIENTS, () => {
 *   reloadClientList();
 * });
 */
export const useGlobalEvent = (eventKey: EGlobalEvent, onEvent?: () => void): void => {
  const handleEvent = useCallback(() => {
    onEvent?.()
  }, [onEvent])

  useEffect(() => {
    if (!onEvent) return

    window.addEventListener(eventKey, handleEvent)
    return () => {
      window.removeEventListener(eventKey, handleEvent)
    }
  }, [eventKey, handleEvent, onEvent])
}

/**
 * Dispatch a global event
 *
 * @param eventKey - The event type to dispatch
 *
 * @example
 * // Trigger client reload
 * dispatchGlobalEvent(EGlobalEvent.RLOAD_CLIENTS);
 */
export const dispatchGlobalEvent = (eventKey: EGlobalEvent): void => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(eventKey))
  }
}
