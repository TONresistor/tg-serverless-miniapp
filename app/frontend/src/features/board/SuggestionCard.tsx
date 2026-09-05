import type { BoardContent } from '../../api/index'
import { TelegramIcon } from '../../components/TelegramIcon'
import { useT } from '../../i18n/index'
import { suggestionTagDefinition } from './suggestion-tags'

export function SuggestionCard({
  suggestion,
  onOpen,
  guideTarget = false,
}: {
  suggestion: BoardContent
  onOpen: () => void
  guideTarget?: boolean
}) {
  const { t, lang } = useT()
  const author = suggestion.author_handle
    ? `@${suggestion.author_handle}`
    : suggestion.author_name
  const date = new Intl.DateTimeFormat(lang, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(suggestion.created_at))
  const tags = suggestion.tags ?? []
  const tagDefinitions = tags.flatMap((tag) => {
    const definition = suggestionTagDefinition(tag)
    return definition ? [definition] : []
  })
  const primaryTag = tagDefinitions[0]

  return (
    <button
      className="suggestion-card"
      type="button"
      data-guide-tour={guideTarget ? 'card' : undefined}
      onClick={onOpen}
    >
      <span
        className={`suggestion-card__mark suggestion-card__mark--${suggestion.kind}`}
        aria-hidden="true"
      >
        {primaryTag ? (
          <span
            className={`suggestion-card__tag-stack suggestion-card__tag-stack--count-${Math.min(tagDefinitions.length, 4)}`}
          >
            {tagDefinitions.slice(0, 4).map((tag) => (
              <span className="suggestion-card__tag-stack-item" key={tag.id}>
                <TelegramIcon
                  name={tag.icon}
                  size={tagDefinitions.length === 1 ? 32 : 18}
                />
              </span>
            ))}
          </span>
        ) : (
          'M'
        )}
      </span>
      <span className="suggestion-card__content">
        <strong className="suggestion-card__title">{suggestion.title}</strong>
        <span className="suggestion-card__excerpt">
          {suggestion.kind === 'issue'
            ? suggestion.problem
            : suggestion.what_we_want || suggestion.body}
        </span>
        <span className="suggestion-card__footer">
          <span className="suggestion-card__context">
            <span className="suggestion-card__author">{author}</span>
            <span className="suggestion-card__date">{date}</span>
          </span>
          <span className="suggestion-card__stats">
            <span title={t('mtonga_rating')}>
              <TelegramIcon name="thumb-up" size={14} /> {suggestion.upvotes}
            </span>
            <span title={t('mtonga_comments')}>
              <TelegramIcon name="reply" size={14} /> {suggestion.comment_count}
            </span>
          </span>
        </span>
      </span>
    </button>
  )
}
