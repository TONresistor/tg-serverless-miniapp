import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  createIssue,
  createSuggestion,
  type BoardContent,
  type ContentKind,
  type SuggestionTag,
  type WebAppUser,
} from '../../api/index'
import resistanceDogAdminAvatar from '../../assets/resistance-dog-admin.png'
import { Avatar } from '../../components/Avatar'
import { MTongaFlag } from '../../components/MTongaFlag'
import { TelegramIcon } from '../../components/TelegramIcon'
import { useT, type TKey } from '../../i18n/index'
import { useNotificationAccess } from '../notifications/NotificationAccess'
import { contributionSteps, type StepID } from './contribution-steps'
import { SUGGESTION_TAGS, suggestionTagLabel } from './suggestion-tags'
import {
  useAutosizeTextarea,
  useConversationScroll,
} from './useConversationLayout'

export function SuggestionWizard({
  user,
  kind: initialKind,
  onClose,
  onCheckExisting,
  onCreated,
}: {
  user: WebAppUser
  kind?: ContentKind
  onClose: () => void
  onCheckExisting: () => void
  onCreated: (content: BoardContent) => void
}) {
  const { t } = useT()
  const notificationAccess = useNotificationAccess()
  const [kind, setKind] = useState<ContentKind | null>(initialKind ?? null)
  const steps = contributionSteps(kind, initialKind === undefined)
  const [stepIndex, setStepIndex] = useState(0)
  const [duplicatesChecked, setDuplicatesChecked] = useState(false)
  const [title, setTitle] = useState('')
  const [whatWeWant, setWhatWeWant] = useState('')
  const [problem, setProblem] = useState('')
  const [whyItMatters, setWhyItMatters] = useState('')
  const [howToAchieve, setHowToAchieve] = useState('')
  const [tags, setTags] = useState<SuggestionTag[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const step = steps[stepIndex]!
  const hasComposer =
    step.id !== 'kind' && step.id !== 'duplicates' && step.id !== 'confirm'

  const back = useCallback(() => {
    setError('')
    if (stepIndex === 0) onClose()
    else setStepIndex((current) => current - 1)
  }, [onClose, stepIndex])

  useEffect(() => {
    document.documentElement.classList.add('modal-open')
    const tg = window.Telegram?.WebApp
    tg?.BackButton.show()
    tg?.BackButton.onClick(back)
    return () => {
      document.documentElement.classList.remove('modal-open')
      tg?.BackButton.offClick(back)
      tg?.BackButton.hide()
    }
  }, [back])

  const answerFor = (id: StepID): string => {
    switch (id) {
      case 'kind':
        return kind
          ? t(
              kind === 'issue'
                ? 'contribution_kind_issue'
                : 'contribution_kind_suggestion',
            )
          : ''
      case 'duplicates':
        return duplicatesChecked ? t('suggestion_confirm_yes') : ''
      case 'title':
        return title
      case 'what':
        return whatWeWant
      case 'problem':
        return problem
      case 'why':
        return whyItMatters
      case 'how':
        return howToAchieve
      case 'tags':
        return tags.map(suggestionTagLabel).join(', ')
      case 'confirm':
        return ''
    }
  }

  const currentValue = answerFor(step.id)

  useAutosizeTextarea(textareaRef, currentValue, stepIndex)
  useConversationScroll(scrollRef, stepIndex + 1)

  const setCurrentValue = (value: string) => {
    switch (step.id) {
      case 'title':
        setTitle(value)
        break
      case 'what':
        setWhatWeWant(value)
        break
      case 'problem':
        setProblem(value)
        break
      case 'why':
        setWhyItMatters(value)
        break
      case 'how':
        setHowToAchieve(value)
        break
      case 'kind':
      case 'duplicates':
      case 'tags':
      case 'confirm':
        break
    }
  }

  const advance = () => {
    if (step.id === 'duplicates') {
      setDuplicatesChecked(true)
    } else if (!currentValue.trim()) {
      setError(
        step.id === 'tags'
          ? t('suggestion_tags_required')
          : t('suggestion_answer_required'),
      )
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error')
      return
    }
    setError('')
    window.Telegram?.WebApp?.HapticFeedback?.selectionChanged()
    setStepIndex((current) => Math.min(current + 1, steps.length - 1))
  }

  const publish = async () => {
    if (kind === null || !duplicatesChecked || step.id !== 'confirm') return
    if (tags.length === 0 || busy) {
      setError(t('suggestion_tags_required'))
      return
    }
    notificationAccess.request()
    setBusy(true)
    setError('')
    try {
      const content =
        kind === 'issue'
          ? (
              await createIssue({
                title: title.trim(),
                problem: problem.trim(),
                why_it_matters: whyItMatters.trim(),
                tags,
              })
            ).issue
          : (
              await createSuggestion({
                title: title.trim(),
                what_we_want: whatWeWant.trim(),
                why_it_matters: whyItMatters.trim(),
                how_to_achieve: howToAchieve.trim(),
                tags,
              })
            ).suggestion
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')
      onCreated(content)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'error')
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error')
    } finally {
      setBusy(false)
    }
  }

  const toggleTag = (tag: SuggestionTag) => {
    setTags((current) =>
      current.includes(tag)
        ? current.filter((item) => item !== tag)
        : [...current, tag],
    )
    setError('')
    window.Telegram?.WebApp?.HapticFeedback?.selectionChanged()
  }

  const chooseKind = (nextKind: ContentKind) => {
    if (kind !== nextKind) {
      setTitle('')
      setWhatWeWant('')
      setProblem('')
      setWhyItMatters('')
      setHowToAchieve('')
      setTags([])
    }
    setKind(nextKind)
    setDuplicatesChecked(false)
    setError('')
    setStepIndex(1)
    window.Telegram?.WebApp?.HapticFeedback?.selectionChanged()
  }

  return (
    <div
      className={`suggestion-wizard${!hasComposer ? ' suggestion-wizard--no-composer' : ''}`}
    >
      <div className="suggestion-wizard__scroll" ref={scrollRef}>
        <section className="suggestion-wizard__intro">
          <MTongaFlag className="suggestion-wizard__flag" />
          <h1>
            {t(kind === 'issue' ? 'issue_new_title' : 'suggestion_new_title')}
          </h1>
          <p>
            {t(
              kind === 'issue'
                ? 'issue_wizard_subtitle'
                : 'suggestion_wizard_subtitle',
            )}
          </p>
        </section>

        <div className="suggestion-chat">
          {steps.slice(0, stepIndex).map((completedStep) => (
            <div className="suggestion-chat__exchange" key={completedStep.id}>
              <BotMessage question={t(completedStep.question)} compact />
              <div className="suggestion-chat__user" data-node-id="6416:5227">
                <div className="suggestion-chat__avatar-column">
                  <Avatar
                    name={user.first_name}
                    photoURL={user.photo_url}
                    className="suggestion-chat__avatar"
                  />
                </div>
                <div className="suggestion-chat__content">
                  <strong className="suggestion-chat__user-name">
                    {user.first_name}
                  </strong>
                  <p className="suggestion-chat__answer">
                    {answerFor(completedStep.id)}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {step.id === 'kind' ? (
            <BotMessage question={t(step.question)} current>
              <div className="suggestion-tag-options suggestion-kind-options">
                {(['issue', 'suggestion'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={
                      kind === option ? 'suggestion-tag-option--selected' : ''
                    }
                    onClick={() => chooseKind(option)}
                  >
                    <span
                      className="suggestion-tag-option__check"
                      aria-hidden="true"
                    >
                      {kind === option ? '✓' : ''}
                    </span>
                    <span>
                      {t(
                        option === 'issue'
                          ? 'contribution_kind_issue'
                          : 'contribution_kind_suggestion',
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </BotMessage>
          ) : step.id === 'duplicates' ? (
            <BotMessage question={t(step.question)} current>
              <div className="suggestion-tag-options suggestion-kind-options">
                <button type="button" onClick={advance}>
                  <span
                    className="suggestion-tag-option__check"
                    aria-hidden="true"
                  />
                  <span>{t('suggestion_confirm_yes')}</span>
                </button>
                <button type="button" onClick={onCheckExisting}>
                  <span
                    className="suggestion-tag-option__check"
                    aria-hidden="true"
                  />
                  <span>{t('contribution_check_existing')}</span>
                </button>
              </div>
            </BotMessage>
          ) : step.id === 'confirm' ? (
            <>
              <BotMessage
                question={t(
                  kind === 'issue'
                    ? 'issue_confirm_intro'
                    : 'suggestion_confirm_intro',
                )}
              >
                <div className="suggestion-confirmation">
                  <h2>{title.trim()}</h2>
                  <p>{kind === 'issue' ? problem.trim() : whatWeWant.trim()}</p>
                  <section>
                    <strong>{t('suggestion_section_why')}</strong>
                    <p>{whyItMatters.trim()}</p>
                  </section>
                  {kind === 'suggestion' && (
                    <section>
                      <strong>{t('suggestion_section_how')}</strong>
                      <p>{howToAchieve.trim()}</p>
                    </section>
                  )}
                </div>
              </BotMessage>
              <BotMessage
                question={t(
                  kind === 'issue'
                    ? 'issue_confirm_public'
                    : 'suggestion_confirm_public',
                )}
                current
              >
                <div className="suggestion-tag-options suggestion-confirm-options">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void publish()}
                  >
                    <span
                      className="suggestion-tag-option__check"
                      aria-hidden="true"
                    />
                    <span>
                      {busy
                        ? t(
                            kind === 'issue'
                              ? 'issue_sending'
                              : 'suggestion_sending',
                          )
                        : t('suggestion_confirm_yes')}
                    </span>
                  </button>
                  <button type="button" disabled={busy} onClick={back}>
                    <span
                      className="suggestion-tag-option__check"
                      aria-hidden="true"
                    />
                    <span>{t('suggestion_confirm_no')}</span>
                  </button>
                </div>
                {error && <p className="suggestion-form__error">{error}</p>}
              </BotMessage>
            </>
          ) : (
            <BotMessage question={t(step.question)} current>
              {step.id === 'tags' && (
                <div className="suggestion-tag-options">
                  {SUGGESTION_TAGS.map((tag) => {
                    const selected = tags.includes(tag.id)
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        role="checkbox"
                        aria-checked={selected}
                        className={
                          selected ? 'suggestion-tag-option--selected' : ''
                        }
                        onClick={() => toggleTag(tag.id)}
                      >
                        <span
                          className="suggestion-tag-option__check"
                          aria-hidden="true"
                        >
                          {selected ? '✓' : ''}
                        </span>
                        <TelegramIcon
                          name={tag.icon}
                          className="suggestion-tag-option__icon"
                          size={22}
                        />
                        <span>{tag.label}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </BotMessage>
          )}
        </div>
      </div>

      {hasComposer && (
        <form
          className="suggestion-writebar"
          data-node-id="6035:2424"
          onSubmit={(event) => {
            event.preventDefault()
            advance()
          }}
        >
          {error && <p className="suggestion-writebar__error">{error}</p>}
          <div className="suggestion-writebar__inner">
            {step.id === 'tags' ? (
              <span className="suggestion-writebar__tags">
                {tags.length > 0
                  ? t('suggestion_tags_selected', { count: tags.length })
                  : t('suggestion_choose_tags')}
              </span>
            ) : (
              <textarea
                ref={textareaRef}
                autoFocus
                value={currentValue}
                maxLength={step.id === 'title' ? 140 : 2400}
                rows={2}
                placeholder={
                  step.id === 'title'
                    ? t(
                        kind === 'issue'
                          ? 'issue_title_ph'
                          : 'suggestion_title_ph',
                      )
                    : step.id === 'problem'
                      ? t('issue_problem_ph')
                      : step.id === 'why' && kind === 'issue'
                        ? t('issue_why_ph')
                        : t(`suggestion_${step.id}_ph` as TKey)
                }
                onChange={(event) => setCurrentValue(event.target.value)}
              />
            )}
            <button
              className="suggestion-writebar__send"
              type="submit"
              disabled={busy}
              aria-label={t('suggestion_next')}
            >
              <TelegramIcon name="send" />
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

function BotHeader() {
  return (
    <div className="suggestion-chat__bot-header">
      <strong>Resistance Dog Admin</strong>
    </div>
  )
}

function BotMessage({
  question,
  compact = false,
  current = false,
  children,
}: {
  question: string
  compact?: boolean
  current?: boolean
  children?: ReactNode
}) {
  const classes = [
    'suggestion-chat__bot',
    compact ? 'suggestion-chat__bot--compact' : '',
    current ? 'suggestion-chat__bot--current' : '',
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <div className={classes} data-node-id="6416:5197">
      <div className="suggestion-chat__avatar-column">
        <img
          className="suggestion-chat__bot-avatar"
          src={resistanceDogAdminAvatar}
          alt=""
          aria-hidden="true"
          data-node-id="6568:10454"
        />
      </div>
      <div className="suggestion-chat__content">
        <BotHeader />
        <p className="suggestion-chat__question">{question}</p>
        {children}
      </div>
    </div>
  )
}
