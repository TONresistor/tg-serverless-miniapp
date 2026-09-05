import {
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react'

export type NavItem = {
  id: string
  label: string
  icon?: ReactNode
  disabled?: boolean
}

type Props = {
  tabs: NavItem[]
  profile: NavItem
  active: string
  onSelect: (id: string) => void
}

export function BottomNav({ tabs, profile, active, onSelect }: Props) {
  const tap = (item: NavItem) => {
    const haptic = window.Telegram?.WebApp?.HapticFeedback
    if (item.disabled) haptic?.notificationOccurred('warning')
    else haptic?.selectionChanged()
    onSelect(item.id)
  }

  return (
    <nav className="bottomnav" aria-label="Main navigation">
      <div className="bottomnav__pill" role="tablist">
        {tabs.map((t) => {
          const isActive = t.id === active
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={isActive}
              aria-disabled={t.disabled || undefined}
              className={`bottomnav__tab ${isActive ? 'bottomnav__tab--active' : ''} ${
                t.disabled ? 'bottomnav__tab--disabled' : ''
              }`}
              onClick={() => tap(t)}
              type="button"
            >
              <span className="bottomnav__icon">
                {isValidElement(t.icon)
                  ? cloneElement(t.icon as ReactElement<{ active?: boolean }>, {
                      active: isActive,
                    })
                  : t.icon}
              </span>
              <span className="bottomnav__label">{t.label}</span>
            </button>
          )
        })}
      </div>
      <button
        className={`bottomnav__profile ${profile.id === active ? 'bottomnav__profile--active' : ''}`}
        onClick={() => tap(profile)}
        type="button"
        aria-label={profile.label}
        aria-pressed={profile.id === active}
      >
        {profile.icon}
      </button>
    </nav>
  )
}
