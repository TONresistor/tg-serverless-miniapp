import {
  prepareIssueShare,
  prepareSuggestionShare,
  type ContentKind,
} from '../../api/index'
import { contentDeepLink } from './suggestion-links'

export function contentShareFallbackURL(
  kind: ContentKind,
  id: number,
  title: string,
  miniAppURL: string,
): string | null {
  const deepLink = contentDeepLink(kind, id, miniAppURL)
  const label = title.trim().replace(/\s+/g, ' ')
  if (!deepLink || !label) return null
  const target = new URL('https://t.me/share/url')
  target.searchParams.set('url', deepLink)
  target.searchParams.set('text', `Check this MTONGA ${kind}: ${label}`)
  return target.toString()
}

function openFallback(
  kind: ContentKind,
  id: number,
  title: string,
  miniAppURL: string,
): void {
  const url = contentShareFallbackURL(kind, id, title, miniAppURL)
  if (!url) return
  try {
    window.Telegram?.WebApp?.openTelegramLink(url)
  } catch {}
}

let shareInFlight: Promise<void> | null = null

async function shareContentOnce(
  kind: ContentKind,
  id: number,
  title: string,
  miniAppURL: string,
): Promise<void> {
  const tg = window.Telegram?.WebApp
  if (!tg?.shareMessage || !tg.isVersionAtLeast('8.0')) {
    openFallback(kind, id, title, miniAppURL)
    return
  }
  try {
    const prepared =
      kind === 'issue'
        ? await prepareIssueShare(id)
        : await prepareSuggestionShare(id)
    tg.shareMessage(prepared.prepared_message_id, () => {
      // Closing the picker is a successful terminal action.
    })
  } catch {
    openFallback(kind, id, title, miniAppURL)
  }
}

export function shareContent(
  kind: ContentKind,
  id: number,
  title: string,
  miniAppURL: string,
): Promise<void> {
  if (shareInFlight) return shareInFlight
  const operation = shareContentOnce(kind, id, title, miniAppURL)
  shareInFlight = operation
  void operation.finally(() => {
    if (shareInFlight === operation) shareInFlight = null
  })
  return operation
}
