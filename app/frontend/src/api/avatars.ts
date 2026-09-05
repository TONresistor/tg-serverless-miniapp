import { call } from './serverless'
import type { ContentKind } from './types'

// Opaque lookup keys retained for the existing avatar cache's callers.
export function avatarPath(): string {
  return 'self'
}
export function contentAuthorAvatarPath(
  kind: ContentKind,
  contentID: number,
  userID: number,
): string {
  return `${kind}:${contentID}:${userID}`
}
export async function fetchAvatar(path = avatarPath()): Promise<Blob> {
  const [kind, contentID, userID] = path.split(':')
  const input =
    path === 'self'
      ? {}
      : { kind, content_id: Number(contentID), user_id: Number(userID) }
  const result = await call<{ base64: string; content_type: string }>(
    'getAvatar',
    input,
  )
  const bytes = Uint8Array.from(atob(result.base64), (c) => c.charCodeAt(0))
  return new Blob([bytes], { type: result.content_type })
}
