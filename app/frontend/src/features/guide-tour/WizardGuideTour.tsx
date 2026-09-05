import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { useDialogFocus } from '../../components/use-dialog-focus'
import { useT, type TKey } from '../../i18n/index'
import {
  GUIDE_TOUR_TARGETS,
  nextAvailableGuideStep,
  previousAvailableGuideStep,
  type GuideTourTarget,
} from './guide-tour'
import './guide-tour.css'

type Step = {
  target: GuideTourTarget
  title: TKey
  body: TKey
}

type Anchor = {
  left: number
  top: number
  width: number
  height: number
  placement: 'above' | 'below'
  popoverOffset: number
  popoverLeft: number
  popoverWidth: number
  arrowLeft: number
}

const STEPS: readonly Step[] = [
  {
    target: 'tabs',
    title: 'guide_tour_tabs_title',
    body: 'guide_tour_tabs_body',
  },
  {
    target: 'search',
    title: 'guide_tour_search_title',
    body: 'guide_tour_search_body',
  },
  {
    target: 'contribute',
    title: 'guide_tour_contribute_title',
    body: 'guide_tour_contribute_body',
  },
  {
    target: 'card',
    title: 'guide_tour_card_title',
    body: 'guide_tour_card_body',
  },
]

function targetElement(target: GuideTourTarget): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-guide-tour="${target}"]`)
}

function availableSteps(): boolean[] {
  return GUIDE_TOUR_TARGETS.map((target) => targetElement(target) !== null)
}

export function WizardGuideTour({ onClose }: { onClose: () => void }) {
  const { t } = useT()
  const dialogRef = useRef<HTMLDivElement>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [available, setAvailable] = useState<boolean[]>(() =>
    STEPS.map(() => true),
  )
  const [targetRevision, setTargetRevision] = useState(0)
  const [anchor, setAnchor] = useState<Anchor | null>(null)
  const step = STEPS[stepIndex]

  const refreshAvailability = useCallback(() => {
    const next = availableSteps()
    setAvailable((current) =>
      current.length === next.length &&
      current.every((value, index) => value === next[index])
        ? current
        : next,
    )
    return next
  }, [])

  const close = useCallback(() => {
    window.Telegram?.WebApp?.HapticFeedback?.selectionChanged()
    onClose()
  }, [onClose])

  const move = useCallback(
    (direction: 'next' | 'back') => {
      const currentAvailability = refreshAvailability()
      const next =
        direction === 'next'
          ? nextAvailableGuideStep(stepIndex, currentAvailability)
          : previousAvailableGuideStep(stepIndex, currentAvailability)
      if (next === null) {
        if (direction === 'next') close()
        return
      }
      window.Telegram?.WebApp?.HapticFeedback?.selectionChanged()
      setStepIndex(next)
    },
    [close, refreshAvailability, stepIndex],
  )

  useEffect(() => {
    refreshAvailability()
    const board = document.querySelector('.mtonga')
    if (!board) return
    const observer = new MutationObserver(() => {
      refreshAvailability()
      setTargetRevision((revision) => revision + 1)
    })
    observer.observe(board, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [refreshAvailability])

  useEffect(() => {
    const tg = window.Telegram?.WebApp
    const back = () => {
      if (previousAvailableGuideStep(stepIndex, refreshAvailability()) === null)
        close()
      else move('back')
    }
    tg?.BackButton.show()
    tg?.BackButton.onClick(back)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      tg?.BackButton.offClick(back)
      tg?.BackButton.hide()
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [close, move, refreshAvailability, stepIndex])

  useLayoutEffect(() => {
    const target = targetElement(step.target)
    if (!target) {
      const next = nextAvailableGuideStep(stepIndex, refreshAvailability())
      if (next === null) close()
      else setStepIndex(next)
      return
    }

    target.scrollIntoView({ block: 'center', inline: 'nearest' })

    let frame = 0
    const update = () => {
      const rect = target.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const edgeInset = 4
      const horizontalGutter = step.target === 'tabs' ? 16 : 8
      const verticalGutter = 8
      const spotlightLeft = Math.max(edgeInset, rect.left - horizontalGutter)
      const spotlightTop = Math.max(edgeInset, rect.top - verticalGutter)
      const popoverWidth = Math.min(360, viewportWidth - 24)
      const popoverLeft = Math.max(
        12,
        Math.min(
          rect.left + rect.width / 2 - popoverWidth / 2,
          viewportWidth - popoverWidth - 12,
        ),
      )
      const placement = rect.bottom + 210 <= viewportHeight ? 'below' : 'above'
      setAnchor({
        left: spotlightLeft,
        top: spotlightTop,
        width: Math.max(
          0,
          Math.min(
            viewportWidth - edgeInset - spotlightLeft,
            rect.width + horizontalGutter * 2,
          ),
        ),
        height: Math.max(
          0,
          Math.min(
            viewportHeight - edgeInset - spotlightTop,
            rect.height + verticalGutter * 2,
          ),
        ),
        placement,
        popoverOffset:
          placement === 'below'
            ? Math.min(rect.bottom + 16, viewportHeight - 12)
            : Math.max(viewportHeight - rect.top + 16, 12),
        popoverLeft,
        popoverWidth,
        arrowLeft: Math.max(
          24,
          Math.min(popoverWidth - 24, rect.left + rect.width / 2 - popoverLeft),
        ),
      })
    }
    update()
    frame = window.requestAnimationFrame(update)
    const observer = new ResizeObserver(update)
    observer.observe(target)
    const screen = target.closest<HTMLElement>('.screen')
    screen?.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    window.visualViewport?.addEventListener('resize', update)
    window.visualViewport?.addEventListener('scroll', update)
    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
      screen?.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('scroll', update)
    }
  }, [available, close, refreshAvailability, step, stepIndex, targetRevision])

  const availableIndices = STEPS.flatMap((_, index) =>
    available[index] ? [index] : [],
  )
  const progressIndex = Math.max(0, availableIndices.indexOf(stepIndex))
  const hasPrevious = previousAvailableGuideStep(stepIndex, available) !== null
  const hasNext = nextAvailableGuideStep(stepIndex, available) !== null

  useDialogFocus(dialogRef, anchor !== null)

  if (!anchor) return null

  const popoverStyle: CSSProperties & { '--guide-tour-arrow-left': string } = {
    left: anchor.popoverLeft,
    width: anchor.popoverWidth,
    '--guide-tour-arrow-left': `${anchor.arrowLeft}px`,
  }
  if (anchor.placement === 'below') popoverStyle.top = anchor.popoverOffset
  else popoverStyle.bottom = anchor.popoverOffset

  return (
    <div
      ref={dialogRef}
      className="guide-tour"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-tour-title"
    >
      <div
        className="guide-tour__spotlight"
        aria-hidden="true"
        style={{
          left: anchor.left,
          top: anchor.top,
          width: anchor.width,
          height: anchor.height,
        }}
      />
      <section
        className={`guide-tour__popover guide-tour__popover--${anchor.placement}`}
        style={popoverStyle}
      >
        <div className="guide-tour__content" key={step.target}>
          <div className="guide-tour__top">
            <div
              className="guide-tour__progress"
              aria-label={t('guide_tour_progress', {
                current: progressIndex + 1,
                total: availableIndices.length,
              })}
            >
              {STEPS.map(
                (item, index) =>
                  available[index] && (
                    <span
                      key={item.target}
                      className={`guide-tour__dot${index === stepIndex ? ' guide-tour__dot--active' : ''}`}
                    />
                  ),
              )}
            </div>
            <button type="button" className="guide-tour__skip" onClick={close}>
              {t('guide_tour_skip')}
            </button>
          </div>
          <h2 id="guide-tour-title">{t(step.title)}</h2>
          <p>{t(step.body)}</p>
          <div className="guide-tour__actions">
            {hasPrevious && (
              <button
                type="button"
                className="guide-tour__back"
                onClick={() => move('back')}
              >
                {t('guide_tour_back')}
              </button>
            )}
            <button
              type="button"
              className="guide-tour__next"
              onClick={() => move('next')}
            >
              {t(hasNext ? 'guide_tour_next' : 'guide_tour_done')}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
