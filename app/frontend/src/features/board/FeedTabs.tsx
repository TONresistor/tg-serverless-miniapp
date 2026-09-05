import { useLayoutEffect, useRef, useState } from 'react'
import type { ContentFilter } from '../../api/index'
import { useT } from '../../i18n/index'

export function FeedTabs({
  kind,
  onChange,
  active,
}: {
  kind: ContentFilter
  onChange: (kind: ContentFilter) => void
  active: boolean
}) {
  const { t, lang } = useT()
  const viewport = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ left: false, right: false })
  useLayoutEffect(() => {
    const element = viewport.current
    if (!element || !active) return
    const measure = () =>
      setEdges({
        left: element.scrollLeft > 1,
        right:
          element.scrollWidth - element.clientWidth - element.scrollLeft > 1,
      })
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    element.addEventListener('scroll', measure, { passive: true })
    const selected = element.querySelector<HTMLElement>(
      '[aria-selected="true"]',
    )
    if (selected) {
      element.scrollLeft =
        selected.offsetLeft - (element.clientWidth - selected.offsetWidth) / 2
    }
    measure()
    return () => {
      observer.disconnect()
      element.removeEventListener('scroll', measure)
    }
  }, [kind, active, lang])
  return (
    <div className="mtonga-tabs-wrap" data-guide-tour="tabs">
      <div
        className="mtonga-tabs"
        role="tablist"
        aria-label={t('mtonga_content_type')}
        ref={viewport}
      >
        {(
          [
            ['all', 'mtonga_tab_all'],
            ['suggestion', 'mtonga_tab_suggestions'],
            ['issue', 'mtonga_tab_issues'],
            ['mine', 'my_contributions_title'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={kind === value}
            onClick={() => onChange(value)}
          >
            {t(label)}
          </button>
        ))}
      </div>
      {edges.left && (
        <button
          className="mtonga-tabs-more mtonga-tabs-more--left"
          type="button"
          aria-label={t('tabs_previous')}
          onClick={() =>
            viewport.current?.scrollBy({ left: -180, behavior: 'smooth' })
          }
        >
          ‹
        </button>
      )}
      {edges.right && (
        <button
          className="mtonga-tabs-more mtonga-tabs-more--right"
          type="button"
          aria-label={t('tabs_more')}
          onClick={() =>
            viewport.current?.scrollBy({ left: 180, behavior: 'smooth' })
          }
        >
          ›
        </button>
      )}
    </div>
  )
}
