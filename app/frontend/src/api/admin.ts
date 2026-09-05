import { call } from './serverless'

export function adminDeleteSuggestion(id: number): Promise<{ ok: true }> {
  return call('deleteContent', { kind: 'suggestion', id })
}

export function adminDeleteIssue(id: number): Promise<{ ok: true }> {
  return call('deleteContent', { kind: 'issue', id })
}

export function adminDeleteSuggestionComment(
  id: number,
): Promise<{ ok: true; suggestion_id: number }> {
  return call('deleteComment', { id })
}
