import type { ContentKind } from '../../api/index'

const CONTENT_START_PARAM_RE = /^(suggestion|issue)_([1-9][0-9]*)$/

export type ContentTarget = { kind: ContentKind; id: number }

export function contentTargetFromStartParam(
  value: unknown,
): ContentTarget | null {
  if (typeof value !== 'string') return null
  const match = CONTENT_START_PARAM_RE.exec(value)
  if (!match?.[1] || !match[2]) return null
  const id = Number(match[2])
  if (!Number.isSafeInteger(id)) return null
  return { kind: match[1] as ContentKind, id }
}

export function contentDeepLink(
  kind: ContentKind,
  id: number,
  miniAppURL: string,
): string | null {
  if (!Number.isSafeInteger(id) || id <= 0) return null
  let target: URL
  try {
    target = new URL(miniAppURL)
  } catch {
    return null
  }
  if (target.protocol !== 'https:' || target.hostname !== 't.me') return null
  target.searchParams.set('startapp', `${kind}_${id}`)
  return target.toString()
}
