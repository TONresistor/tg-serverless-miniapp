import type { TelegramWebApp } from '../../telegram/types'

type WriteAccessApp = Pick<
  TelegramWebApp,
  'isVersionAtLeast' | 'requestWriteAccess' | 'openTelegramLink'
>
type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
const PENDING_TIMEOUT_MS = 30_000

export function createNotificationAccess({
  userID,
  initiallyAllowed,
  botURL,
  getWebApp,
  storage,
  onAllowed,
}: {
  userID: number
  initiallyAllowed: boolean
  botURL: string
  getWebApp: () => WriteAccessApp | undefined
  storage?: StorageLike
  onAllowed: () => void
}) {
  const key = `mtonga:notification-prompt-dismissed:${userID}`
  let allowed = initiallyAllowed
  let pending = false
  let pendingTimer: ReturnType<typeof setTimeout> | undefined
  let requestGeneration = 0
  let dismissed = false
  try {
    dismissed = storage?.getItem(key) === '1'
  } catch {}

  return {
    request(explicit = false) {
      if (allowed || pending || (dismissed && !explicit)) return
      const tg = getWebApp()
      if (!tg) return
      if (!tg.requestWriteAccess || !tg.isVersionAtLeast('6.9')) {
        if (explicit) tg.openTelegramLink(botURL)
        return
      }
      pending = true
      const generation = ++requestGeneration
      pendingTimer = setTimeout(() => {
        if (requestGeneration !== generation) return
        pending = false
        pendingTimer = undefined
      }, PENDING_TIMEOUT_MS)
      try {
        // Telegram requires this call inside the user gesture.
        tg.requestWriteAccess((granted) => {
          if (!pending || requestGeneration !== generation) return
          if (pendingTimer !== undefined) clearTimeout(pendingTimer)
          pendingTimer = undefined
          pending = false
          allowed = granted
          dismissed = !granted
          try {
            if (granted) storage?.removeItem(key)
            else storage?.setItem(key, '1')
          } catch {}
          if (granted) onAllowed()
        })
      } catch {
        // Permission UI must never block publishing or subscribing.
        requestGeneration++
        if (pendingTimer !== undefined) clearTimeout(pendingTimer)
        pendingTimer = undefined
        pending = false
      }
    },
    dispose() {
      requestGeneration++
      pending = false
      if (pendingTimer !== undefined) clearTimeout(pendingTimer)
      pendingTimer = undefined
    },
  }
}
