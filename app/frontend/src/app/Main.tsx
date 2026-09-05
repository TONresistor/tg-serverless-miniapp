import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { WebAppUser } from '../api/index'
import { Avatar } from '../components/Avatar'
import { BottomNav, type NavItem } from '../components/BottomNav'
import MTongaTabIcon from '../components/MTongaTabIcon'
import { MTonga } from '../features/board/MTonga'
import type { ContentTarget } from '../features/board/suggestion-links'
import { NotificationAccessProvider } from '../features/notifications/NotificationAccess'
import { ProfilePage } from '../features/profile/ProfilePage'
import { WizardGuideTour } from '../features/guide-tour/WizardGuideTour'
import { useT, type Lang } from '../i18n/index'
import { useExperimentalFeatures } from './experimental-features'

type TabId = 'mtonga' | 'profile'

export function Main({
  user,
  miniAppURL,
  isAdmin,
  initialContent,
  onLanguageChange,
}: {
  user: WebAppUser
  miniAppURL: string
  isAdmin: boolean
  initialContent: ContentTarget | null
  onLanguageChange: (lang: Lang) => void
}) {
  const { t } = useT()
  const experimentalFeatures = useExperimentalFeatures(user.id, isAdmin)
  const [tab, setTab] = useState<TabId>('mtonga')
  const [launchContent, setLaunchContent] = useState(initialContent)
  const [guideTourOpen, setGuideTourOpen] = useState(false)
  const otherScreen = useRef<HTMLDivElement>(null)
  const consumeLaunchContent = useCallback(() => setLaunchContent(null), [])

  useLayoutEffect(() => {
    if (tab !== 'mtonga' && otherScreen.current)
      otherScreen.current.scrollTop = 0
  }, [tab])

  const tabs = useMemo<NavItem[]>(
    () => [{ id: 'mtonga', label: 'MTONGA', icon: <MTongaTabIcon /> }],
    [],
  )
  const profile = useMemo<NavItem>(
    () => ({
      id: 'profile',
      label: t('nav_profile'),
      icon: (
        <Avatar
          name={user.first_name}
          photoURL={user.photo_url}
          className="bottomnav__avatar"
        />
      ),
    }),
    [user.first_name, user.photo_url, t],
  )

  return (
    <NotificationAccessProvider key={user.id} user={user} botURL={miniAppURL}>
      <div className="app-shell">
        <div className="screen" hidden={tab !== 'mtonga'}>
          <section className="screen__body">
            <MTonga
              active={tab === 'mtonga'}
              user={user}
              miniAppURL={miniAppURL}
              adminModeEnabled={experimentalFeatures.adminModeEnabled}
              initialContent={launchContent}
              onInitialContentOpened={consumeLaunchContent}
            />
          </section>
        </div>
        <div className="screen" hidden={tab === 'mtonga'} ref={otherScreen}>
          <section className="screen__body">
            {tab === 'profile' && (
              <ProfilePage
                user={user}
                miniAppURL={miniAppURL}
                onLanguageChange={onLanguageChange}
                experimentalFeaturesUnlocked={experimentalFeatures.unlocked}
                experimentalWelcomeReplayEnabled={
                  experimentalFeatures.welcomeReplayEnabled
                }
                onExperimentalWelcomeReplayChange={
                  experimentalFeatures.setWelcomeReplayEnabled
                }
                onStartGuideTour={() => {
                  setTab('mtonga')
                  setGuideTourOpen(true)
                }}
                adminFeaturesUnlocked={experimentalFeatures.adminUnlocked}
                adminModeEnabled={experimentalFeatures.adminModeEnabled}
                onAdminModeChange={experimentalFeatures.setAdminModeEnabled}
              />
            )}
          </section>
        </div>
        <BottomNav
          tabs={tabs}
          profile={profile}
          active={tab}
          onSelect={(id) => {
            if (id === 'profile') experimentalFeatures.registerProfileTap()
            else experimentalFeatures.resetProfileTaps()
            setTab(id as TabId)
          }}
        />
        {guideTourOpen && (
          <WizardGuideTour onClose={() => setGuideTourOpen(false)} />
        )}
      </div>
    </NotificationAccessProvider>
  )
}
