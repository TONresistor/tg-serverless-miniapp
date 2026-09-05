import { prepareInviteShare } from '../../api/index'

export const INVITE_SHARE_MESSAGE = 'Join the MTONGA Mouvement'

export function miniAppInviteDeepLink(miniAppURL: string): string | null {
  let target: URL
  try {
    target = new URL(miniAppURL)
  } catch {
    return null
  }
  if (target.protocol !== 'https:' || target.hostname !== 't.me') return null
  target.search = '?startapp'
  return target.toString()
}

export function inviteShareFallbackURL(miniAppURL: string): string | null {
  const deepLink = miniAppInviteDeepLink(miniAppURL)
  if (!deepLink) return null
  const target = new URL('https://t.me/share/url')
  target.searchParams.set('url', deepLink)
  target.searchParams.set('text', INVITE_SHARE_MESSAGE)
  return target.toString()
}

function openFallback(miniAppURL: string): void {
  const url = inviteShareFallbackURL(miniAppURL)
  if (!url) return
  try {
    window.Telegram?.WebApp?.openTelegramLink(url)
  } catch {}
}

let inviteShareInFlight: Promise<void> | null = null

async function shareInviteOnce(miniAppURL: string): Promise<void> {
  const tg = window.Telegram?.WebApp
  if (!tg?.Serverless || !tg?.shareMessage || !tg.isVersionAtLeast('8.0')) {
    openFallback(miniAppURL)
    return
  }
  try {
    const prepared = await prepareInviteShare()
    tg.shareMessage(prepared.prepared_message_id, () => {})
  } catch {
    openFallback(miniAppURL)
  }
}

export function shareInvite(miniAppURL: string): Promise<void> {
  if (inviteShareInFlight) return inviteShareInFlight
  const operation = shareInviteOnce(miniAppURL)
  inviteShareInFlight = operation
  void operation.finally(() => {
    if (inviteShareInFlight === operation) inviteShareInFlight = null
  })
  return operation
}
