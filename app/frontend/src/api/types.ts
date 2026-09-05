export type WebAppUser = {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  is_premium?: boolean
  photo_url?: string
  allows_write_to_pm?: boolean
}

export type InitResponse = {
  user: WebAppUser
  start_param?: string
  mini_app_url: string
  is_admin: boolean
}

export type SuggestionSort = 'rating' | 'newest'

export type ContentKind = 'suggestion' | 'issue'

export type ContentFilter = ContentKind | 'all' | 'mine'

export type SuggestionCategory =
  | 'general'
  | 'ecosystem'
  | 'developers'
  | 'wallets'
  | 'defi'
  | 'governance'
  | 'telegram'
  | 'other'

type SuggestionStatus = 'open' | 'planned' | 'completed' | 'declined'

export type SuggestionTag =
  | 'defi'
  | 'gifts'
  | 'telegram'
  | 'web3'
  | 'stars'
  | 'cocoon'
  | 'foundation'
  | 'fragment'

export type Suggestion = {
  id: number
  author_id: number
  author_name: string
  author_handle?: string
  kind: 'suggestion'
  title: string
  body: string
  what_we_want: string
  why_it_matters: string
  how_to_achieve: string
  tags: SuggestionTag[]
  category: SuggestionCategory
  status: SuggestionStatus
  upvotes: number
  downvotes: number
  score: number
  comment_count: number
  user_vote: -1 | 0 | 1
  subscribed: boolean
  created_at: string
}

export type Issue = {
  id: number
  author_id: number
  author_name: string
  author_handle?: string
  kind: 'issue'
  title: string
  body: string
  problem: string
  why_it_matters: string
  tags: SuggestionTag[]
  category: SuggestionCategory
  upvotes: number
  downvotes: number
  score: number
  comment_count: number
  user_vote: -1 | 0 | 1
  subscribed: boolean
  created_at: string
}

export type BoardContent = Suggestion | Issue

export type ContentTotals = {
  suggestions: number
  issues: number
}

export type SuggestionComment = {
  id: number
  suggestion_id: number
  author_id: number
  author_name: string
  author_handle?: string
  reply_to?: {
    id: number
    author_id: number
    author_name: string
    author_handle?: string
    body: string
  }
  body: string
  created_at: string
}

export type SuggestionPage = {
  suggestions: Suggestion[]
  total: number
  next_cursor?: string
  totals: ContentTotals
}

export type IssuePage = {
  issues: Issue[]
  total: number
  next_cursor?: string
  totals: ContentTotals
}

export type ContentPage = {
  items: BoardContent[]
  total: number
  next_cursor?: string
  totals: ContentTotals
}
