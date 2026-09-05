import {
  contentAuthorAvatarPath,
  type ContentKind,
  type SuggestionComment,
} from '../../api/index'
import { Avatar } from '../../components/Avatar'
import { TelegramIcon } from '../../components/TelegramIcon'
import { useT } from '../../i18n/index'

export function CommentCard({
  comment,
  photoURL,

  contentID,
  kind,
  adminModeEnabled,
  deleting,
  onDelete,
  onReply,
}: {
  comment: SuggestionComment
  photoURL?: string

  contentID: number
  kind: ContentKind
  adminModeEnabled: boolean
  deleting: boolean
  onDelete: () => void
  onReply: () => void
}) {
  const { t, lang } = useT()
  const date = new Intl.DateTimeFormat(lang, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(comment.created_at))
  return (
    <article className="suggestion-comment">
      <Avatar
        name={comment.author_name}
        photoURL={photoURL}
        className="suggestion-comment__avatar"
        path={contentAuthorAvatarPath(kind, contentID, comment.author_id)}
      />
      <div className="suggestion-comment__content">
        <div className="suggestion-comment__meta">
          <strong>{comment.author_name}</strong>
          <time>{date}</time>
        </div>
        {comment.reply_to && (
          <div className="suggestion-comment__quote">
            <strong>{comment.reply_to.author_name}</strong>
            <span>{comment.reply_to.body}</span>
          </div>
        )}
        <p>{comment.body}</p>
        {adminModeEnabled && (
          <button
            type="button"
            className="suggestion-comment__delete-button"
            disabled={deleting}
            onClick={onDelete}
          >
            {t('admin_delete_comment')}
          </button>
        )}
      </div>
      <button
        type="button"
        className="suggestion-comment__reply-button"
        aria-label={t('suggestion_reply')}
        onClick={onReply}
      >
        <TelegramIcon name="comment-reply" size={20} />
      </button>
    </article>
  )
}
