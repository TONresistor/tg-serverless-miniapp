import { call } from './serverless'
import type {
  BoardContent,
  ContentFilter,
  ContentKind,
  ContentPage,
  Issue,
  IssuePage,
  Suggestion,
  SuggestionComment,
  SuggestionPage,
  SuggestionSort,
  SuggestionTag,
} from './types'

function listSuggestions(
  sort: SuggestionSort,
  query = '',
  limit = 20,
  cursor = '',
  signal?: AbortSignal,
): Promise<SuggestionPage> {
  const params: Record<string, unknown> = {
    sort,
    limit: limit,
  }
  if (query) params.q = query
  if (cursor) params.cursor = cursor
  return call('listContent', { kind: 'suggestion', ...params }, signal)
}

function listIssues(
  sort: SuggestionSort,
  query = '',
  limit = 20,
  cursor = '',
  signal?: AbortSignal,
): Promise<IssuePage> {
  const params: Record<string, unknown> = { sort, limit: limit }
  if (query) params.q = query
  if (cursor) params.cursor = cursor
  return call('listContent', { kind: 'issue', ...params }, signal)
}

export async function listContent(
  kind: ContentFilter,

  sort: SuggestionSort,
  query = '',
  limit = 20,
  cursor = '',
  signal?: AbortSignal,
): Promise<ContentPage> {
  if (kind === 'all' || kind === 'mine') {
    const params: Record<string, unknown> = { sort, limit: limit }
    if (query) params.q = query
    if (cursor) params.cursor = cursor
    return call(
      'listContent',
      { kind: 'all', mine: kind === 'mine', ...params },
      signal,
    )
  }
  if (kind === 'issue') {
    const page = await listIssues(sort, query, limit, cursor, signal)
    return { ...page, items: page.issues }
  }
  const page = await listSuggestions(sort, query, limit, cursor, signal)
  return { ...page, items: page.suggestions }
}

function getSuggestion(
  id: number,
): Promise<{ suggestion: Suggestion; comments: SuggestionComment[] }> {
  return call('getContent', { kind: 'suggestion', id })
}

function getIssue(
  id: number,
): Promise<{ issue: Issue; comments: SuggestionComment[] }> {
  return call('getContent', { kind: 'issue', id })
}

export async function getContent(
  kind: ContentKind,

  id: number,
): Promise<{ content: BoardContent; comments: SuggestionComment[] }> {
  if (kind === 'issue') {
    const result = await getIssue(id)
    return { content: result.issue, comments: result.comments }
  }
  const result = await getSuggestion(id)
  return { content: result.suggestion, comments: result.comments }
}

export function createSuggestion(input: {
  title: string
  what_we_want: string
  why_it_matters: string
  how_to_achieve: string
  tags: SuggestionTag[]
}): Promise<{ suggestion: Suggestion }> {
  return call('createContent', { kind: 'suggestion', ...input })
}

export function createIssue(input: {
  title: string
  problem: string
  why_it_matters: string
  tags: SuggestionTag[]
}): Promise<{ issue: Issue }> {
  return call('createContent', { kind: 'issue', ...input })
}

export function voteSuggestion(
  id: number,
  value: -1 | 0 | 1,
): Promise<{ suggestion: Suggestion }> {
  return call('voteContent', { kind: 'suggestion', id, value })
}

export function voteIssue(
  id: number,
  value: -1 | 0 | 1,
): Promise<{ issue: Issue }> {
  return call('voteContent', { kind: 'issue', id, value })
}

export function setSuggestionSubscription(
  id: number,
  subscribed: boolean,
): Promise<{ suggestion: Suggestion }> {
  return call('subscribeContent', { kind: 'suggestion', id, subscribed })
}

export function setIssueSubscription(
  id: number,
  subscribed: boolean,
): Promise<{ issue: Issue }> {
  return call('subscribeContent', { kind: 'issue', id, subscribed })
}

export function createSuggestionComment(
  id: number,
  body: string,
  replyToCommentID?: number,
): Promise<{ comment: SuggestionComment }> {
  return call('createComment', {
    kind: 'suggestion',
    id,
    body,
    reply_to_comment_id: replyToCommentID,
  })
}

export function createIssueComment(
  id: number,
  body: string,
  replyToCommentID?: number,
): Promise<{ comment: SuggestionComment }> {
  return call('createComment', {
    kind: 'issue',
    id,
    body,
    reply_to_comment_id: replyToCommentID,
  })
}
