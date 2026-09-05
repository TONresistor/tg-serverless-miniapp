import { useEffect, useId, useRef, type ReactNode } from 'react'
import { useDialogFocus } from './use-dialog-focus'

export function Sheet({
  title,
  onClose,
  children,
  hero,
  noBack = false,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  hero?: ReactNode
  noBack?: boolean
}) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useDialogFocus(dialogRef)

  useEffect(() => {
    document.documentElement.classList.add('modal-open')
    const tg = window.Telegram?.WebApp
    if (!noBack) {
      tg?.BackButton.show()
      tg?.BackButton.onClick(onClose)
    }
    return () => {
      document.documentElement.classList.remove('modal-open')
      if (!noBack) {
        tg?.BackButton.offClick(onClose)
        tg?.BackButton.hide()
      }
    }
  }, [onClose, noBack])

  return (
    <div className="sheet-scrim" onClick={onClose}>
      <div
        ref={dialogRef}
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="sheet__grab" />
        <button
          className="sheet__close"
          type="button"
          onClick={onClose}
          aria-label="Close"
        >
          <svg viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path
              d="M1.5 1.5l11 11m0-11l-11 11"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <div className="sheet__body">
          {hero}
          <h2 id={titleId} className="sheet__title">
            {title}
          </h2>
          {children}
        </div>
      </div>
    </div>
  )
}
