import { call } from './serverless'

export function prepareInviteShare(): Promise<{ prepared_message_id: string }> {
  return call('prepareInvite')
}

export function prepareSuggestionShare(
  id: number,
): Promise<{ prepared_message_id: string }> {
  return call('prepareContent', { kind: 'suggestion', id })
}

export function prepareIssueShare(
  id: number,
): Promise<{ prepared_message_id: string }> {
  return call('prepareContent', { kind: 'issue', id })
}
