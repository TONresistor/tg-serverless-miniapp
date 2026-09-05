import { useLayoutEffect, type RefObject } from 'react'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function useDialogFocus<T extends HTMLElement>(
  dialogRef: RefObject<T | null>,
  active = true,
): void {
  useLayoutEffect(() => {
    if (!active) return
    const dialog = dialogRef.current
    if (!dialog) return

    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    const focusableElements = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((element) => element.getClientRects().length > 0)

    const focusables = focusableElements()
    ;(focusables[0] ?? dialog).focus()

    const containTab = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const currentFocusables = focusableElements()
      if (currentFocusables.length === 0) {
        event.preventDefault()
        dialog.focus()
        return
      }

      const first = currentFocusables[0]!
      const last = currentFocusables[currentFocusables.length - 1]!
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          !dialog.contains(document.activeElement))
      ) {
        event.preventDefault()
        last.focus()
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          !dialog.contains(document.activeElement))
      ) {
        event.preventDefault()
        first.focus()
      }
    }

    dialog.addEventListener('keydown', containTab)
    return () => {
      dialog.removeEventListener('keydown', containTab)
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [active, dialogRef])
}
