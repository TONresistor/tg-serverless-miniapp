import { useCallback, useEffect, useRef, useState } from 'react'
import {
  adminDeleteIssue,
  adminDeleteSuggestion,
  adminDeleteSuggestionComment,
  createIssueComment,
  createSuggestionComment,
  getContent,
  setIssueSubscription,
  setSuggestionSubscription,
  voteIssue,
  voteSuggestion,
  type BoardContent,
  type ContentKind,
  type SuggestionComment,
  type WebAppUser,
} from '../../api/index'
import { TelegramIcon } from '../../components/TelegramIcon'
import { useT, type TKey } from '../../i18n/index'
import { useNotificationAccess } from '../notifications/NotificationAccess'
import { CommentCard } from './CommentCard'
import { suggestionCategoryKey } from './suggestion-categories'
import { contentDeepLink } from './suggestion-links'
import { shareContent } from './suggestion-share'
import { suggestionTagDefinition, suggestionTagLabel } from './suggestion-tags'
import {
  useAutosizeTextarea,
  useConversationScroll,
} from './useConversationLayout'

type DetailData = { content: BoardContent; comments: SuggestionComment[] }

export function SuggestionDetail({
  miniAppURL,
  adminModeEnabled,
  kind = 'suggestion',
  id,
  onClose,
  onChanged,
  user,
}: {
  miniAppURL: string
  adminModeEnabled: boolean
  kind?: ContentKind
  id: number
  onClose: () => void
  onChanged: () => void
  user?: WebAppUser
}) {
  const { t, lang } = useT()
  const notificationAccess = useNotificationAccess()
  const [data, setData] = useState<DetailData | null>(null)
  const [error, setError] = useState('')
  const [voteBusy, setVoteBusy] = useState(false)
  const [comment, setComment] = useState('')
  const [replyTo, setReplyTo] = useState<SuggestionComment | null>(null)
  const [commentBusy, setCommentBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const [subscriptionBusy, setSubscriptionBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [shareBusy, setShareBusy] = useState(false)
  const [adminBusy, setAdminBusy] = useState(false)
  const [deletingCommentID, setDeletingCommentID] = useState<number | null>(
    null,
  )
  const commentRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrollRequest, setScrollRequest] = useState(0)
  const requestGeneration = useRef(0)
  const mounted = useRef(false)
  useAutosizeTextarea(commentRef, comment, data !== null && !error)
  useConversationScroll(scrollRef, scrollRequest)

  const load = useCallback(() => {
    const generation = ++requestGeneration.current
    setError('')
    getContent(kind, id)
      .then((result) => {
        if (mounted.current && requestGeneration.current === generation)
          setData(result)
      })
      .catch((reason: unknown) => {
        if (mounted.current && requestGeneration.current === generation)
          setError(reason instanceof Error ? reason.message : 'error')
      })
  }, [id, kind])

  useEffect(() => {
    mounted.current = true
    load()
    return () => {
      mounted.current = false
    }
  }, [load])

  useEffect(() => {
    document.documentElement.classList.add('modal-open')
    const tg = window.Telegram?.WebApp
    tg?.BackButton.show()
    tg?.BackButton.onClick(onClose)
    return () => {
      document.documentElement.classList.remove('modal-open')
      tg?.BackButton.offClick(onClose)
      tg?.BackButton.hide()
    }
  }, [onClose])

  const vote = async (value: -1 | 1) => {
    if (!data || voteBusy) return
    const next = data.content.user_vote === value ? 0 : value
    setVoteBusy(true)
    setActionError('')
    try {
      const content =
        kind === 'issue'
          ? (await voteIssue(id, next)).issue
          : (await voteSuggestion(id, next)).suggestion
      setData((current) => current && { ...current, content })
      window.Telegram?.WebApp?.HapticFeedback?.selectionChanged()
      onChanged()
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : 'error')
    } finally {
      setVoteBusy(false)
    }
  }

  const sendComment = async () => {
    const body = comment.trim()
    if (!data || !body || commentBusy) return
    setCommentBusy(true)
    setActionError('')
    try {
      const result =
        kind === 'issue'
          ? await createIssueComment(id, body, replyTo?.id)
          : await createSuggestionComment(id, body, replyTo?.id)
      setData(
        (current) =>
          current && {
            content: {
              ...current.content,
              comment_count: current.content.comment_count + 1,
            },
            comments: [...current.comments, result.comment],
          },
      )
      setComment('')
      setReplyTo(null)
      setScrollRequest((current) => current + 1)
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')
      onChanged()
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : 'error')
    } finally {
      setCommentBusy(false)
    }
  }

  const toggleSubscription = async () => {
    if (!data || subscriptionBusy) return
    const next = !data.content.subscribed
    if (next) notificationAccess.request()
    setSubscriptionBusy(true)
    setActionError('')
    try {
      const content =
        kind === 'issue'
          ? (await setIssueSubscription(id, next)).issue
          : (await setSuggestionSubscription(id, next)).suggestion
      setData((current) => current && { ...current, content })
      window.Telegram?.WebApp?.HapticFeedback?.selectionChanged()
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : 'error')
    } finally {
      setSubscriptionBusy(false)
    }
  }

  const copyLink = async () => {
    const url = contentDeepLink(kind, id, miniAppURL)
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')
    } catch {
      setActionError(t('suggestion_copy_failed'))
    }
  }

  const share = async () => {
    if (!data || shareBusy) return
    const currentContent = data.content
    setShareBusy(true)
    setActionError('')
    try {
      await shareContent(
        kind,
        currentContent.id,
        currentContent.title,
        miniAppURL,
      )
    } finally {
      setShareBusy(false)
    }
  }

  const deleteSuggestion = async () => {
    if (!data || !adminModeEnabled || adminBusy) return
    const confirmed = await confirmAdminAction(
      t(
        kind === 'issue'
          ? 'admin_confirm_issue_title'
          : 'admin_confirm_suggestion_title',
      ),
      t(kind === 'issue' ? 'admin_confirm_issue' : 'admin_confirm_suggestion'),
      t('admin_delete'),
      t('cancel'),
    )
    if (!confirmed) return
    setAdminBusy(true)
    setActionError('')
    try {
      if (kind === 'issue') await adminDeleteIssue(id)
      else await adminDeleteSuggestion(id)
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')
      onChanged()
      onClose()
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : 'error')
    } finally {
      setAdminBusy(false)
    }
  }

  const deleteComment = async (commentID: number) => {
    if (!data || !adminModeEnabled || deletingCommentID !== null) return
    const confirmed = await confirmAdminAction(
      t('admin_confirm_comment_title'),
      t('admin_confirm_comment'),
      t('admin_delete'),
      t('cancel'),
    )
    if (!confirmed) return
    setDeletingCommentID(commentID)
    setActionError('')
    try {
      await adminDeleteSuggestionComment(commentID)
      setData(
        (current) =>
          current && {
            content: {
              ...current.content,
              comment_count: Math.max(0, current.content.comment_count - 1),
            },
            comments: current.comments
              .filter((item) => item.id !== commentID)
              .map((item) =>
                item.reply_to?.id === commentID
                  ? { ...item, reply_to: undefined }
                  : item,
              ),
          },
      )
      if (replyTo?.id === commentID) setReplyTo(null)
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')
      onChanged()
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : 'error')
    } finally {
      setDeletingCommentID(null)
    }
  }

  const suggestion = data?.content
  const subscribed = suggestion?.subscribed ?? false
  const author = suggestion
    ? suggestion.author_handle
      ? `@${suggestion.author_handle}`
      : suggestion.author_name
    : ''
  const date = suggestion
    ? new Intl.DateTimeFormat(lang, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date(suggestion.created_at))
    : ''

  return (
    <div className="suggestion-detail">
      <div className="suggestion-detail__scroll" ref={scrollRef}>
        {error ? (
          <div className="mtonga-state">
            <p>{error}</p>
            <button type="button" onClick={load}>
              {t('mtonga_retry')}
            </button>
          </div>
        ) : !suggestion || !data ? (
          <p className="mtonga-state muted">
            {t(kind === 'issue' ? 'issue_loading' : 'mtonga_loading')}
          </p>
        ) : (
          <div className="suggestion-detail__content">
            <h1>{suggestion.title}</h1>
            <p className="suggestion-detail__author">
              {author} · {date}
            </p>

            <div className="suggestion-detail__tags">
              {suggestion.kind === 'suggestion' && (
                <span
                  className={`suggestion-detail__status suggestion-detail__status--${suggestion.status}`}
                >
                  {t(`mtonga_status_${suggestion.status}` as TKey)}
                </span>
              )}
              {(suggestion.tags ?? []).length > 0 ? (
                (suggestion.tags ?? []).map((tag) => {
                  const definition = suggestionTagDefinition(tag)
                  return (
                    <span key={tag}>
                      {definition && (
                        <TelegramIcon name={definition.icon} size={16} />
                      )}
                      {suggestionTagLabel(tag)}
                    </span>
                  )
                })
              ) : (
                <span>{t(suggestionCategoryKey(suggestion.category))}</span>
              )}
            </div>

            <article className="suggestion-detail__body">
              <SuggestionSection
                body={
                  suggestion.kind === 'issue'
                    ? suggestion.problem
                    : suggestion.what_we_want || suggestion.body
                }
              />
              {suggestion.why_it_matters && (
                <SuggestionSection
                  title={t('suggestion_section_why')}
                  body={suggestion.why_it_matters}
                />
              )}
              {suggestion.kind === 'suggestion' &&
                suggestion.how_to_achieve && (
                  <SuggestionSection
                    title={t('suggestion_section_how')}
                    body={suggestion.how_to_achieve}
                  />
                )}
            </article>

            <div className="suggestion-detail__actions">
              <button
                type="button"
                className={
                  suggestion.user_vote === 1
                    ? 'suggestion-detail__action--on'
                    : ''
                }
                disabled={voteBusy}
                onClick={() => vote(1)}
              >
                <TelegramIcon name="thumb-up" size={20} /> {suggestion.upvotes}
              </button>
              <button
                type="button"
                className={
                  suggestion.user_vote === -1
                    ? 'suggestion-detail__action--on'
                    : ''
                }
                disabled={voteBusy}
                onClick={() => vote(-1)}
              >
                <TelegramIcon name="thumb-down" size={20} />{' '}
                {suggestion.downvotes}
              </button>
              <button
                type="button"
                disabled={subscriptionBusy}
                onClick={() => void toggleSubscription()}
              >
                <TelegramIcon
                  name={subscribed ? 'unsubscribe' : 'subscribe'}
                  size={20}
                />
                {t(
                  subscribed ? 'suggestion_subscribed' : 'suggestion_subscribe',
                )}
              </button>
              <button type="button" onClick={() => void copyLink()}>
                <TelegramIcon name="link" size={20} />
                {t(copied ? 'suggestion_copied' : 'suggestion_copy_link')}
              </button>
              <button
                className="suggestion-detail__share"
                type="button"
                disabled={shareBusy}
                aria-label={t(
                  kind === 'issue' ? 'issue_share' : 'suggestion_share',
                )}
                onClick={() => void share()}
              >
                <TelegramIcon name="share" size={20} />
              </button>
              {adminModeEnabled && (
                <button
                  className="suggestion-detail__admin-delete"
                  type="button"
                  disabled={adminBusy}
                  onClick={() => void deleteSuggestion()}
                >
                  {t(
                    kind === 'issue'
                      ? 'admin_delete_issue'
                      : 'admin_delete_suggestion',
                  )}
                </button>
              )}
            </div>

            {actionError && (
              <p className="suggestion-form__error">{actionError}</p>
            )}

            <section className="suggestion-comments">
              <h2>
                {t('mtonga_comments')}
                {suggestion.comment_count > 0 && (
                  <span> {suggestion.comment_count}</span>
                )}
              </h2>

              {data.comments.length === 0 ? (
                <p className="suggestion-comments__empty">
                  {t('suggestion_no_comments')}
                </p>
              ) : (
                <div className="suggestion-comments__list">
                  {data.comments.map((item) => (
                    <CommentCard
                      key={item.id}
                      comment={item}
                      photoURL={
                        item.author_id === user?.id ? user.photo_url : undefined
                      }
                      contentID={suggestion.id}
                      kind={kind}
                      adminModeEnabled={adminModeEnabled}
                      deleting={deletingCommentID === item.id}
                      onDelete={() => void deleteComment(item.id)}
                      onReply={() => {
                        setReplyTo(item)
                        window.Telegram?.WebApp?.HapticFeedback?.selectionChanged()
                        window.requestAnimationFrame(() =>
                          commentRef.current?.focus(),
                        )
                      }}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
      {suggestion && data && !error && (
        <div className="suggestion-detail__footer">
          <div className="suggestion-comment-compose">
            {replyTo && (
              <div className="suggestion-comment-compose__reply">
                <span>
                  <strong>
                    {t('suggestion_replying_to', { name: replyTo.author_name })}
                  </strong>
                  <small>{replyTo.body}</small>
                </span>
                <button
                  type="button"
                  aria-label={t('suggestion_cancel_reply')}
                  onClick={() => setReplyTo(null)}
                >
                  ×
                </button>
              </div>
            )}
            <textarea
              ref={commentRef}
              value={comment}
              maxLength={1000}
              rows={2}
              placeholder={t('suggestion_comment_ph')}
              onChange={(event) => setComment(event.target.value)}
            />
            <button
              className="suggestion-comment-compose__send"
              type="button"
              disabled={!comment.trim() || commentBusy}
              aria-label={t('suggestion_comment_send')}
              onClick={sendComment}
            >
              {commentBusy ? <span>…</span> : <TelegramIcon name="send" />}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function SuggestionSection({ title, body }: { title?: string; body: string }) {
  return (
    <section className="suggestion-detail__section">
      {title && <h2>{title}</h2>}
      <p>{body}</p>
    </section>
  )
}

function confirmAdminAction(
  title: string,
  message: string,
  destructiveLabel: string,
  cancelLabel: string,
): Promise<boolean> {
  const tg = window.Telegram?.WebApp
  if (!tg?.showPopup)
    return Promise.resolve(window.confirm(`${title}\n\n${message}`))
  return new Promise((resolve) => {
    tg.showPopup?.(
      {
        title,
        message,
        buttons: [
          { id: 'cancel', type: 'cancel', text: cancelLabel },
          { id: 'delete', type: 'destructive', text: destructiveLabel },
        ],
      },
      (buttonID) => resolve(buttonID === 'delete'),
    )
  })
}
