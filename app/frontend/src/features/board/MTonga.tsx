import { useCallback, useEffect, useRef, useState } from 'react'
import {
  listContent,
  type BoardContent,
  type ContentFilter,
  type ContentKind,
  type ContentTotals,
  type SuggestionSort,
  type WebAppUser,
} from '../../api/index'
import { MTongaFlag } from '../../components/MTongaFlag'
import { useT } from '../../i18n/index'
import { FeedTabs } from './FeedTabs'
import { SuggestionCard } from './SuggestionCard'
import { SuggestionDetail } from './SuggestionDetail'
import { SuggestionWizard } from './SuggestionWizard'
import { contributionPromptMode } from './contribution-prompt'
import './mtonga.css'
import type { ContentTarget } from './suggestion-links'

const PAGE_SIZE = 20

export function MTonga({
  active,

  user,
  miniAppURL,
  adminModeEnabled,
  initialContent,
  onInitialContentOpened,
}: {
  active: boolean

  user: WebAppUser
  miniAppURL: string
  adminModeEnabled: boolean
  initialContent: ContentTarget | null
  onInitialContentOpened: () => void
}) {
  const { t } = useT()
  const [kind, setKind] = useState<ContentFilter>(initialContent?.kind ?? 'all')
  const mixedFeed = kind === 'all' || kind === 'mine'
  const [suggestions, setSuggestions] = useState<BoardContent[]>([])
  const [totals, setTotals] = useState<ContentTotals>({
    suggestions: 0,
    issues: 0,
  })
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [sort, setSort] = useState<SuggestionSort>('rating')
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [loadMoreError, setLoadMoreError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [creating, setCreating] = useState<ContentKind | 'choose' | null>(null)
  const [selected, setSelected] = useState<ContentTarget | null>(initialContent)
  const requestGeneration = useRef(0)
  const loadMoreGeneration = useRef<number | null>(null)
  const loadSentinel = useRef<HTMLDivElement>(null)
  const boardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (initialContent !== null) onInitialContentOpened()
  }, [initialContent, onInitialContentOpened])

  const refresh = useCallback(() => setRefreshKey((current) => current + 1), [])

  useEffect(() => {
    const timeout = window.setTimeout(() => setSearch(query.trim()), 250)
    return () => window.clearTimeout(timeout)
  }, [query])

  useEffect(() => {
    const controller = new AbortController()
    const generation = ++requestGeneration.current
    loadMoreGeneration.current = null
    setLoading(true)
    setLoadingMore(false)
    setError('')
    setLoadMoreError('')
    listContent(kind, sort, search, PAGE_SIZE, '', controller.signal)
      .then((result) => {
        if (generation !== requestGeneration.current) return
        setSuggestions(result.items)
        setTotals(result.totals)
        setNextCursor(result.next_cursor ?? null)
      })
      .catch((reason: unknown) => {
        if (
          controller.signal.aborted ||
          generation !== requestGeneration.current
        )
          return
        setError(reason instanceof Error ? reason.message : 'error')
      })
      .finally(() => {
        if (generation === requestGeneration.current) setLoading(false)
      })
    return () => controller.abort()
  }, [kind, refreshKey, search, sort])

  const loadMore = useCallback(async () => {
    if (loading || loadMoreGeneration.current !== null || !nextCursor) return
    const generation = requestGeneration.current
    loadMoreGeneration.current = generation
    setLoadingMore(true)
    setLoadMoreError('')
    try {
      const result = await listContent(
        kind,
        sort,
        search,
        PAGE_SIZE,
        nextCursor,
      )
      if (generation !== requestGeneration.current) return
      const nextItems = result.items
      setSuggestions((current) => {
        const known = new Set(current.map((suggestion) => suggestion.id))
        return [
          ...current,
          ...nextItems.filter((suggestion) => !known.has(suggestion.id)),
        ]
      })
      setTotals(result.totals)
      setNextCursor(result.next_cursor ?? null)
    } catch (reason) {
      if (generation === requestGeneration.current) {
        setLoadMoreError(reason instanceof Error ? reason.message : 'error')
      }
    } finally {
      if (loadMoreGeneration.current === generation) {
        loadMoreGeneration.current = null
        setLoadingMore(false)
      }
    }
  }, [kind, loading, nextCursor, search, sort])

  useEffect(() => {
    const sentinel = loadSentinel.current
    if (!active || !sentinel || !nextCursor || loadMoreError) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMore()
      },
      { rootMargin: '300px 0px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [active, loadMore, loadMoreError, nextCursor])

  const selectSort = (next: SuggestionSort) => {
    if (next === sort) return
    window.Telegram?.WebApp?.HapticFeedback?.selectionChanged()
    setSort(next)
  }

  const selectKind = (next: ContentFilter) => {
    if (next === kind) return
    window.Telegram?.WebApp?.HapticFeedback?.selectionChanged()
    requestGeneration.current += 1
    setSuggestions([])
    setNextCursor(null)
    setLoading(true)
    setKind(next)
  }

  const openSuggestionForm = (targetKind: ContentKind | 'choose') => {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light')
    setCreating(targetKind)
  }

  const checkExistingContributions = () => {
    setCreating(null)
    setQuery('')
    setSearch('')
    selectKind('all')
    window.requestAnimationFrame(() => {
      boardRef.current?.closest<HTMLElement>('.screen')?.scrollTo({ top: 0 })
    })
  }

  const promptMode = contributionPromptMode({
    query,
    search,
    loading,
    nextCursor,
  })
  const creationActions =
    promptMode === 'buttons' ? (
      <div className="mtonga-create-actions" data-guide-tour="contribute">
        {kind !== 'issue' && (
          <NewSuggestionButton
            kind="suggestion"
            label={t('mtonga_new')}
            onClick={() => openSuggestionForm('suggestion')}
          />
        )}
        {kind !== 'suggestion' && (
          <NewSuggestionButton
            kind="issue"
            label={t('issue_new')}
            onClick={() => openSuggestionForm('issue')}
          />
        )}
      </div>
    ) : promptMode === 'contribute' ? (
      <p className="mtonga-contribute-hint" data-guide-tour="contribute">
        <button type="button" onClick={() => openSuggestionForm('choose')}>
          <span aria-hidden="true">+</span> {t('mtonga_contribute')}
        </button>
      </p>
    ) : null

  return (
    <div className="mtonga" ref={boardRef}>
      <header className="mtonga__hero">
        <MTongaFlag />
        <div className="mtonga__brand">
          <h1 className="mtonga__title">MTONGA</h1>
          <span className="mtonga__kicker">MAKE TON GREAT AGAIN</span>
        </div>
      </header>

      <div className="mtonga-feed-header">
        <form
          className="mtonga-search"
          data-guide-tour="search"
          onSubmit={(event) => {
            event.preventDefault()
            setSearch(query.trim())
          }}
        >
          <SearchIcon />
          <input
            value={query}
            maxLength={120}
            placeholder={t('mtonga_board_search')}
            aria-label={t('mtonga_board_search')}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            onChange={(event) => setQuery(event.target.value)}
          />
          {query && (
            <button
              type="button"
              aria-label={t('mtonga_clear')}
              onClick={() => {
                setQuery('')
                setSearch('')
              }}
            >
              ×
            </button>
          )}
        </form>

        <FeedTabs kind={kind} onChange={selectKind} active={active} />
      </div>

      <div className="mtonga-feed-toolbar">
        <h2>
          {t(
            mixedFeed
              ? 'mtonga_cards_count'
              : kind === 'issue'
                ? 'issue_count'
                : 'mtonga_count',
            {
              count: mixedFeed
                ? totals.issues + totals.suggestions
                : kind === 'issue'
                  ? totals.issues
                  : totals.suggestions,
            },
          )}
        </h2>
        <label className="mtonga-sort-dropdown">
          <span aria-hidden="true">↑↓</span>
          <select
            value={sort}
            aria-label={t(kind === 'issue' ? 'issue_sort' : 'mtonga_sort')}
            onChange={(event) =>
              selectSort(event.target.value as SuggestionSort)
            }
          >
            <option value="rating">{t('mtonga_sort_rating')}</option>
            <option value="newest">{t('mtonga_sort_newest')}</option>
          </select>
          <svg
            width="12"
            height="8"
            viewBox="0 0 12 8"
            fill="none"
            aria-hidden="true"
          >
            <path d="m1 1 5 5 5-5" stroke="currentColor" strokeWidth="2" />
          </svg>
        </label>
      </div>

      {error ? (
        <div className="mtonga-state">
          <p>{error}</p>
          <button type="button" onClick={refresh}>
            {t('mtonga_retry')}
          </button>
        </div>
      ) : loading && suggestions.length === 0 ? (
        <p className="mtonga-state muted">
          {t(kind === 'issue' ? 'issue_loading' : 'mtonga_loading')}
        </p>
      ) : suggestions.length === 0 ? (
        <div className="mtonga-state mtonga-state--empty">
          <h3>
            {t(
              kind === 'mine'
                ? 'my_contributions_title'
                : kind === 'issue'
                  ? 'issue_empty_title'
                  : 'mtonga_empty_title',
            )}
          </h3>
          <p>
            {search
              ? t(
                  mixedFeed
                    ? 'mtonga_all_empty_search'
                    : kind === 'issue'
                      ? 'issue_empty_search'
                      : 'mtonga_empty_search',
                )
              : t(
                  kind === 'mine'
                    ? 'my_contributions_empty'
                    : kind === 'issue'
                      ? 'issue_empty'
                      : 'mtonga_empty',
                )}
          </p>
          {creationActions}
        </div>
      ) : (
        <>
          <div
            className={`suggestion-list${loading ? ' suggestion-list--loading' : ''}`}
          >
            {suggestions.map((suggestion, index) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                guideTarget={index === 0}
                onOpen={() =>
                  setSelected({ kind: suggestion.kind, id: suggestion.id })
                }
              />
            ))}
          </div>
          {nextCursor && (
            <div
              className="mtonga-load-sentinel"
              ref={loadSentinel}
              aria-live="polite"
            >
              {loadingMore && !loadMoreError && (
                <p>
                  {t(kind === 'issue' ? 'issue_loading' : 'mtonga_loading')}
                </p>
              )}
              {loadMoreError && (
                <>
                  <p className="mtonga-load-sentinel__error">{loadMoreError}</p>
                  <button type="button" onClick={() => void loadMore()}>
                    {t('mtonga_retry')}
                  </button>
                </>
              )}
            </div>
          )}
          {creationActions}
        </>
      )}

      {creating && (
        <SuggestionWizard
          user={user}
          kind={creating === 'choose' ? undefined : creating}
          onClose={() => setCreating(null)}
          onCheckExisting={checkExistingContributions}
          onCreated={(suggestion) => {
            setCreating(null)
            setSelected({ kind: suggestion.kind, id: suggestion.id })
            refresh()
          }}
        />
      )}

      {selected !== null && (
        <SuggestionDetail
          user={user}
          miniAppURL={miniAppURL}
          adminModeEnabled={adminModeEnabled}
          kind={selected.kind}
          id={selected.id}
          onClose={() => setSelected(null)}
          onChanged={refresh}
        />
      )}
    </div>
  )
}

function NewSuggestionButton({
  kind,
  label,
  onClick,
}: {
  kind: ContentKind
  label: string
  onClick: () => void
}) {
  return (
    <button
      className={`mtonga__new mtonga__new--${kind}`}
      type="button"
      onClick={onClick}
    >
      <span aria-hidden="true">+</span>
      {label}
    </button>
  )
}

function SearchIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path
        d="m16.5 16.5 4 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}
