/**
 * Handle keyboard shortcuts with optional modifier keys
 */

import { useCallback, useEffect } from 'react'

/**
 * Supported keyboard keys for shortcuts
 */
export enum EKeyboardKey {
  Enter = 'Enter',
  Escape = 'Escape',
  Space = ' ',
  Tab = 'Tab',
  Backspace = 'Backspace',
  Delete = 'Delete',
  ArrowUp = 'ArrowUp',
  ArrowDown = 'ArrowDown',
  ArrowLeft = 'ArrowLeft',
  ArrowRight = 'ArrowRight',
  Home = 'Home',
  End = 'End',
  PageUp = 'PageUp',
  PageDown = 'PageDown',
  // Add letter keys for shortcuts
  K = 'k',
  One = '1',
  Two = '2',
  Three = '3',
  Four = '4',
  Five = '5'
}

/**
 * Supported modifier keys for combinations
 */
export enum ESpecialKey {
  Ctrl = 'Control',
  Alt = 'Alt',
  Shift = 'Shift'
}

/**
 * Hook to handle keyboard shortcuts with optional modifier keys
 *
 * @param key - The main key to listen for (from EKeyboardKey enum)
 * @param callback - Function to execute when the shortcut is triggered
 * @param combo - Optional modifier key (Ctrl, Alt, or Shift)
 *
 * @example
 * // Simple shortcut
 * useShortcutKeyEvent(EKeyboardKey.Enter, () => console.log('Enter pressed'));
 *
 * // With modifier key
 * useShortcutKeyEvent(EKeyboardKey.Enter, () => console.log('Ctrl+Enter pressed'), ESpecialKey.Ctrl);
 */
export const useShortcutKeyEvent = (key: EKeyboardKey, callback: () => void, combo?: ESpecialKey): void => {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const comboActivated = combo
        ? {
            [ESpecialKey.Ctrl]: e.ctrlKey,
            [ESpecialKey.Alt]: e.altKey,
            [ESpecialKey.Shift]: e.shiftKey
          }[combo]
        : true

      if (e.key.toLowerCase() === key.toLowerCase() && comboActivated) {
        e.preventDefault()
        callback()
      }
    },
    [callback, combo, key]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown, { passive: false })
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])
}
