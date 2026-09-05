import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { postInit, type WebAppUser } from '../api/index'
import {
  contentTargetFromStartParam,
  type ContentTarget,
} from '../features/board/suggestion-links'
import { I18nProvider, resolveLang, translator, type Lang } from '../i18n/index'
import { getCloudItem, setCloudItem } from '../telegram/cloud-storage'
import { AppErrorBoundary } from './ErrorBoundary'
import { Main } from './Main'
import { readWelcomeReplay } from './experimental-features'

const Onboarding = lazy(() =>
  import('../features/onboarding/Onboarding').then((m) => ({
    default: m.Onboarding,
  })),
)

const ONBOARDED_KEY = 'onboarded_mtonga_v1'
const LANG_KEY = 'lang'

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'onboarding'
      user: WebAppUser
      miniAppURL: string
      isAdmin: boolean
    }
  | {
      status: 'main'
      user: WebAppUser
      miniAppURL: string
      isAdmin: boolean
      initialContent: ContentTarget | null
    }

export function App() {
  const [state, setState] = useState<State>({ status: 'loading' })

  const [lang, setLang] = useState<Lang>(() => resolveLang(navigator.language))
  const t = useMemo(() => translator(lang), [lang])

  // Avoid rerunning /api/init when the language changes.
  const tRef = useRef(t)
  tRef.current = t

  const changeLang = useCallback((next: Lang) => {
    setLang(next)
    void setCloudItem(LANG_KEY, next)
    window.Telegram?.WebApp?.HapticFeedback?.selectionChanged()
  }, [])

  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (!tg) {
      setState({
        status: 'error',
        message: tRef.current('err_open_in_telegram'),
      })
      return
    }
    tg.ready()
    tg.expand()

    try {
      tg.setHeaderColor?.('bg_color')
      if (tg.isVersionAtLeast('8.0') && tg.isFullscreen) {
        tg.exitFullscreen?.()
      }
    } catch {}

    if (!tg.initData) {
      setState({ status: 'error', message: tRef.current('err_no_initdata') })
      return
    }

    let cancelled = false
    void Promise.all([
      postInit(),
      getCloudItem(ONBOARDED_KEY).catch(() => null),
      getCloudItem(LANG_KEY).catch(() => null),
    ])
      .then(([result, onboarded, savedLang]) => {
        if (cancelled) return
        const verifiedUser = result.user
        const initialContent = contentTargetFromStartParam(result.start_param)
        const nextLang =
          savedLang === 'en' || savedLang === 'ru' || savedLang === 'zh'
            ? savedLang
            : resolveLang(verifiedUser.language_code)
        setLang(nextLang)
        const replayWelcome = readWelcomeReplay(verifiedUser.id)
        if (initialContent === null && (replayWelcome || onboarded !== '1')) {
          setState({
            status: 'onboarding',
            user: verifiedUser,
            miniAppURL: result.mini_app_url,
            isAdmin: result.is_admin,
          })
          return
        }
        setState({
          status: 'main',
          user: verifiedUser,
          miniAppURL: result.mini_app_url,
          isAdmin: result.is_admin,
          initialContent,
        })
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setState({
          status: 'error',
          message: e instanceof Error ? e.message : 'unknown error',
        })
      })

    return () => {
      cancelled = true
    }
  }, [])

  const handleDone = useCallback(() => {
    window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')
    void setCloudItem(ONBOARDED_KEY, '1')
    setState((s) =>
      s.status === 'onboarding'
        ? {
            status: 'main',
            user: s.user,
            miniAppURL: s.miniAppURL,
            isAdmin: s.isAdmin,
            initialContent: null,
          }
        : s,
    )
  }, [])

  let content: ReactNode
  if (state.status === 'loading') {
    content = (
      <main className="centered">
        <p className="muted">{t('loading')}</p>
      </main>
    )
  } else if (state.status === 'error') {
    content = (
      <main className="centered">
        <div className="card">
          <h2>⚠️ {t('error_title')}</h2>
          <p className="error">{state.message}</p>
          <button type="button" onClick={() => window.location.reload()}>
            {t('mtonga_retry')}
          </button>
        </div>
      </main>
    )
  } else if (state.status === 'onboarding') {
    content = (
      <Suspense
        fallback={
          <main className="centered">
            <p className="muted">{t('loading')}</p>
          </main>
        }
      >
        <Onboarding onDone={handleDone} />
      </Suspense>
    )
  } else {
    content = (
      <Main
        user={state.user}
        miniAppURL={state.miniAppURL}
        isAdmin={state.isAdmin}
        initialContent={state.initialContent}
        onLanguageChange={changeLang}
      />
    )
  }

  return (
    <I18nProvider lang={lang}>
      <AppErrorBoundary
        title={t('error_title')}
        message={t('entry_load_error')}
        retryLabel={t('mtonga_retry')}
      >
        {content}
      </AppErrorBoundary>
    </I18nProvider>
  )
}
