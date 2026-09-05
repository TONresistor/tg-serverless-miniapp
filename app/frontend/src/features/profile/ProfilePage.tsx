import { useEffect, useState, type ReactNode } from 'react'
import type { WebAppUser } from '../../api/index'
import { appConfig, telegramLinks } from '../../app/config'
import { Avatar } from '../../components/Avatar'
import { IconExperimental } from '../../components/icons'
import { Sheet } from '../../components/Sheet'
import { TelegramIcon } from '../../components/TelegramIcon'
import { useT, type Lang } from '../../i18n/index'
import { useNotificationAccess } from '../notifications/NotificationAccess'
import { shareInvite } from './invite-share'
import './ProfilePage.css'

const SUPPORT_URL = telegramLinks.support
const GROUPCHAT_URL = telegramLinks.group

const LANG_NAMES: Record<Lang, string> = {
  en: 'English',
  ru: 'Русский',
  zh: '简体中文',
}

type OpenSheet = null | 'lang' | 'experimental'

export function ProfilePage({
  user,

  miniAppURL,
  onLanguageChange,
  experimentalFeaturesUnlocked,
  experimentalWelcomeReplayEnabled,
  onExperimentalWelcomeReplayChange,
  onStartGuideTour,
  adminFeaturesUnlocked,
  adminModeEnabled,
  onAdminModeChange,
}: {
  user: WebAppUser

  miniAppURL: string
  onLanguageChange: (lang: Lang) => void
  experimentalFeaturesUnlocked: boolean
  experimentalWelcomeReplayEnabled: boolean
  onExperimentalWelcomeReplayChange: (enabled: boolean) => void
  onStartGuideTour: () => void
  adminFeaturesUnlocked: boolean
  adminModeEnabled: boolean
  onAdminModeChange: (enabled: boolean) => void
}) {
  const { t, lang } = useT()
  const notificationAccess = useNotificationAccess()
  const [sheet, setSheet] = useState<OpenSheet>(null)
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ')
  const tg = window.Telegram?.WebApp
  const [termsOpen, setTermsOpen] = useState(false)

  if (termsOpen) {
    return <TermsScreen onClose={() => setTermsOpen(false)} />
  }

  return (
    <div className="profile">
      <header className="profile__head">
        <Avatar
          name={user.first_name}
          photoURL={user.photo_url}
          className="profile-avatar"
        />
        <h1 className="profile__name">{fullName}</h1>
        {user.username && <p className="profile__handle">@{user.username}</p>}
      </header>

      <section className="section-card">
        {!notificationAccess.allowed && (
          <Row
            icon={<TelegramIcon name="subscribe" size={18} />}
            tint="blue"
            label={t('profile_enable_notifications')}
            onClick={() => notificationAccess.request(true)}
          />
        )}
        <Row
          icon={<IconLanguage />}
          tint="blue"
          label={t('profile_lang')}
          value={LANG_NAMES[lang]}
          onClick={() => setSheet('lang')}
        />
        <Row
          icon={<IconGuideTour />}
          tint="indigo"
          label={t('profile_guide_tour')}
          onClick={onStartGuideTour}
        />
        {experimentalFeaturesUnlocked && (
          <Row
            icon={<IconExperimental />}
            tint="orange"
            label={t('experimental_title')}
            value={t('experimental_beta')}
            onClick={() => setSheet('experimental')}
          />
        )}
        {adminFeaturesUnlocked && (
          <button
            type="button"
            role="switch"
            aria-checked={adminModeEnabled}
            className="nav-row toggle-row"
            onClick={() => {
              window.Telegram?.WebApp?.HapticFeedback?.selectionChanged()
              onAdminModeChange(!adminModeEnabled)
            }}
          >
            <span className="nav-row__icon nav-row__icon--red">
              <IconAdmin />
            </span>
            <span className="toggle-row__label">{t('admin_mode')}</span>
            <span className="sbadge">{t('admin_badge')}</span>
            <span
              className={`sw${adminModeEnabled ? ' sw--on' : ''}`}
              aria-hidden="true"
            />
          </button>
        )}
      </section>

      <section className="section-card">
        <Row
          icon={<IconChannel />}
          tint="tg"
          label={t('profile_channel')}
          onClick={() => tg?.openTelegramLink(GROUPCHAT_URL)}
        />
        <Row
          icon={<IconInviteFriends />}
          tint="blue"
          label={t('profile_invite_friends')}
          onClick={() => void shareInvite(miniAppURL)}
        />
      </section>

      <section className="section-card profile__links">
        <button
          type="button"
          className="nav-row nav-row--link"
          onClick={() => {
            window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light')
            setTermsOpen(true)
          }}
        >
          <span className="nav-row__label">{t('profile_terms')}</span>
          <span className="nav-row__chevron">
            <IconChevron />
          </span>
        </button>
        <button
          type="button"
          className="nav-row nav-row--link"
          onClick={() => {
            window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light')
            tg?.openTelegramLink(SUPPORT_URL)
          }}
        >
          <span className="nav-row__label">{t('profile_support')}</span>
          <span className="nav-row__chevron">
            <IconChevron />
          </span>
        </button>
      </section>

      {sheet === 'lang' && (
        <Sheet title={t('profile_lang_title')} onClose={() => setSheet(null)}>
          <div className="opt-list">
            {(Object.keys(LANG_NAMES) as Lang[]).map((l) => (
              <button
                key={l}
                className="opt"
                type="button"
                onClick={() => {
                  if (l !== lang) onLanguageChange(l)
                  setSheet(null)
                }}
              >
                <span>{LANG_NAMES[l]}</span>
                {lang === l && (
                  <span className="opt__check">
                    <IconCheck />
                  </span>
                )}
              </button>
            ))}
          </div>
        </Sheet>
      )}

      {sheet === 'experimental' && (
        <Sheet title={t('experimental_title')} onClose={() => setSheet(null)}>
          <section className="section-card">
            <button
              type="button"
              role="switch"
              aria-checked={experimentalWelcomeReplayEnabled}
              className="nav-row toggle-row"
              onClick={() => {
                window.Telegram?.WebApp?.HapticFeedback?.selectionChanged()
                onExperimentalWelcomeReplayChange(
                  !experimentalWelcomeReplayEnabled,
                )
              }}
            >
              <span className="toggle-row__label">
                {t('experimental_replay_welcome')}
              </span>
              <span className="sbadge">{t('experimental_beta')}</span>
              <span
                className={`sw${experimentalWelcomeReplayEnabled ? ' sw--on' : ''}`}
                aria-hidden="true"
              />
            </button>
          </section>
        </Sheet>
      )}
    </div>
  )
}

function Row({
  icon,
  tint,
  label,
  value,
  onClick,
}: {
  icon: ReactNode
  tint: 'blue' | 'tg' | 'teal' | 'green' | 'indigo' | 'orange'
  label: string
  value?: string
  onClick: () => void
}) {
  return (
    <button
      className="nav-row"
      type="button"
      onClick={() => {
        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light')
        onClick()
      }}
    >
      <span className={`nav-row__icon nav-row__icon--${tint}`}>{icon}</span>
      <span className="nav-row__label">{label}</span>
      {value && <span className="nav-row__value">{value}</span>}
      <span className="nav-row__chevron">
        <IconChevron />
      </span>
    </button>
  )
}

function IconLanguage() {
  return (
    <svg
      width="19"
      height="18"
      viewBox="0 0 22 21"
      fill="none"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12.5874 0.182551C12.3494 -0.0608503 11.9599 -0.0608503 11.7219 0.182551C11.4803 0.422318 11.4803 0.814667 11.7219 1.05443L14.0299 3.37946C14.268 3.62286 14.6575 3.62286 14.8955 3.37946C15.1371 3.13969 15.1371 2.74734 14.8955 2.50757L12.5874 0.182551ZM20.2329 5.88612H18.5307C18.4333 9.17385 17.5389 11.7641 15.761 13.5514C15.6781 13.6386 15.5915 13.7222 15.5013 13.8057C16.9872 14.6631 18.9346 15.1136 21.3869 15.1136C21.7259 15.1136 22 15.3897 22 15.7311C22 16.0726 21.7259 16.3487 21.3869 16.3487C18.574 16.3487 16.2479 15.7893 14.4627 14.6159C12.6776 15.7893 10.3515 16.3487 7.5385 16.3487C7.19951 16.3487 6.92542 16.0726 6.92542 15.7311C6.92542 15.3897 7.19951 15.1136 7.5385 15.1136C9.99083 15.1136 11.9383 14.6631 13.4241 13.8057C13.3339 13.7222 13.2474 13.6386 13.1644 13.5514C11.3865 11.7641 10.4921 9.17385 10.3947 5.88612H8.69254C8.35354 5.88612 8.07946 5.61003 8.07946 5.26854C8.07946 4.92705 8.35354 4.65096 8.69254 4.65096H20.2329C20.5719 4.65096 20.846 4.92705 20.846 5.26854C20.846 5.61003 20.5719 5.88612 20.2329 5.88612ZM11.6245 5.88612H17.3009C17.2035 8.95951 16.3705 11.1901 14.8955 12.6796C14.7584 12.8176 14.6142 12.9484 14.4627 13.0755C14.3112 12.9484 14.167 12.8176 14.0299 12.6796C12.5549 11.1901 11.7219 8.95951 11.6245 5.88612Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6.37726 7.36106C6.27988 7.12856 6.05629 6.97598 5.80745 6.97598C5.55861 6.97598 5.33502 7.12856 5.23765 7.36106L0.044491 20.1487C-0.0817308 20.4647 0.0697358 20.8244 0.383489 20.9552C0.697242 21.0823 1.05427 20.9298 1.1841 20.6137L2.91515 16.3487C2.91876 16.3487 2.91876 16.3487 2.92237 16.3487H8.69254C8.69614 16.3487 8.69614 16.3487 8.69975 16.3487L10.4308 20.6137C10.5606 20.9298 10.9177 21.0823 11.2314 20.9552C11.5452 20.8244 11.6966 20.4647 11.5704 20.1487L6.37726 7.36106ZM8.19847 15.1136L5.80745 9.22834L3.41644 15.1136H8.19847Z"
        fill="currentColor"
      />
    </svg>
  )
}

function IconGuideTour() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M14 25C20.0751 25 25 20.0751 25 14C25 7.92487 20.0751 3 14 3C7.92487 3 3 7.92487 3 14C3 20.0751 7.92487 25 14 25ZM15.25 8.75001C15.25 9.44037 14.6904 10 14 10C13.3096 10 12.75 9.44037 12.75 8.75001C12.75 8.05965 13.3096 7.50001 14 7.50001C14.6904 7.50001 15.25 8.05965 15.25 8.75001ZM11.165 12.5C11.165 12.0388 11.5389 11.665 12 11.665H14.25C14.7112 11.665 15.085 12.0388 15.085 12.5V18.665H16.5C16.9612 18.665 17.335 19.0388 17.335 19.5C17.335 19.9612 16.9612 20.335 16.5 20.335H12C11.5389 20.335 11.165 19.9612 11.165 19.5C11.165 19.0388 11.5389 18.665 12 18.665H13.415V13.335H12C11.5389 13.335 11.165 12.9612 11.165 12.5Z"
        fill="currentColor"
      />
    </svg>
  )
}

function IconChannel() {
  return (
    <svg
      width="17"
      height="18"
      viewBox="0 0 20 22"
      fill="none"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4.70588 14.9539H7.80364C8.09987 14.9539 8.24376 14.9539 8.38764 14.9708C9.03936 15.0131 9.67414 15.2327 10.2158 15.596C10.3343 15.6721 10.4528 15.765 10.6813 15.9424L13.4151 18.0714C15.5311 19.7105 16.5891 20.53 17.4693 20.5215C18.248 20.5131 18.9674 20.1582 19.4498 19.5584C20 18.8572 20 17.5223 20 14.8526V5.66902C20 2.99084 20 1.65597 19.4498 0.963194C18.9674 0.363351 18.248 0.00851263 17.4693 6.46499e-05C16.5891 -0.00838333 15.5311 0.811122 13.4151 2.45013L10.6813 4.57916C10.4528 4.75658 10.3343 4.84951 10.2158 4.92555C9.67414 5.28883 9.03936 5.50005 8.38764 5.55074C8.24376 5.55919 8.09987 5.55919 7.80364 5.55919H4.70588C2.10749 5.55919 0 7.66287 0 10.2566C0 12.8587 2.10749 14.9539 4.70588 14.9539ZM4.78206 17.3618C4.70588 17.573 4.70588 17.8264 4.70588 18.3502V19.6513C4.70588 20.9524 5.7554 22 7.05882 22C8.36225 22 9.41176 20.9524 9.41176 19.6513V18.3502C9.41176 17.8264 9.41177 17.573 9.33559 17.3618C9.20863 17.0069 8.92933 16.7197 8.56538 16.593C8.35379 16.5169 8.09987 16.5169 7.58358 16.5169H6.53407C6.01777 16.5169 5.7554 16.5169 5.55226 16.593C5.18832 16.7197 4.90901 17.0069 4.78206 17.3618Z"
        fill="currentColor"
      />
    </svg>
  )
}

function TermsScreen({ onClose }: { onClose: () => void }) {
  const { t, lang } = useT()
  const effectiveDate = new Intl.DateTimeFormat(lang, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date('2026-10-06T12:00:00Z'))

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

  return (
    <div className="terms-screen">
      <div className="terms-screen__scroll">
        <div className="terms-screen__topbar">
          <h1>{t('profile_terms')}</h1>
        </div>
        <article className="terms-policy">
          <header>
            <p className="terms-policy__product">MTONGA</p>
            <p className="terms-policy__updated">
              {t('terms_effective', { date: effectiveDate })}
            </p>
          </header>

          <p>{t('terms_intro')}</p>
          {(
            [
              'public',
              'content',
              'use',
              'moderation',
              'privacy',
              'retention',
              'notifications',
              'availability',
              'changes',
            ] as const
          ).map((section) => (
            <section key={section}>
              <h2>{t(`terms_${section}_title`)}</h2>
              <p>{t(`terms_${section}_body`)}</p>
            </section>
          ))}

          <section>
            <h2>{t('terms_contact_title')}</h2>
            <p>
              {t('terms_contact_body')}{' '}
              <button
                type="button"
                onClick={() =>
                  window.Telegram?.WebApp?.openTelegramLink(SUPPORT_URL)
                }
              >
                {t('terms_contact_link', {
                  handle: '@' + appConfig.supportUsername,
                })}
              </button>
              .
            </p>
          </section>
        </article>
      </div>
    </div>
  )
}

function IconAdmin() {
  return (
    <svg
      width="18"
      height="19"
      viewBox="0 0 18 19"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M9 1.2 16 4v4.6c0 4.3-2.8 7.5-7 9.2-4.2-1.7-7-4.9-7-9.2V4l7-2.8Z"
        fill="currentColor"
      />
      <path
        d="m6.1 9.4 1.8 1.8 4-4"
        stroke="#fff"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconInviteFriends() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path d="M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" fill="currentColor" />
      <path
        d="M2.5 20.5c0-4.1 2.8-6.7 7-6.7 2.1 0 3.8.6 5 1.8v4.9h-12Z"
        fill="currentColor"
      />
      <path
        d="M18.5 10v7m-3.5-3.5h7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconChevron() {
  return (
    <svg
      width="8"
      height="13"
      viewBox="0 0 8 13"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M1.5 1.5L6.5 6.5L1.5 11.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2.5 8.5l3.5 3.5 7.5-8.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
