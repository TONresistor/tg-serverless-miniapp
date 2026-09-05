import { createRoot } from 'react-dom/client'
import './styles.css'
import './features/entry/TelegramEntry.css'
import { resolveLang, translator } from './i18n/index'
import { installTelegramTheme } from './telegram/theme'

const tg = window.Telegram?.WebApp
const disposeTheme = installTelegramTheme(tg, document.documentElement)
if (import.meta.hot) import.meta.hot.dispose(disposeTheme)
if (tg) {
  tg.ready()
  tg.expand()
  try {
    tg.setHeaderColor?.('bg_color')
  } catch {}
}

const root = createRoot(document.getElementById('root')!)
function showLoadError() {
  const t = translator(resolveLang(navigator.language))
  root.render(
    <main className="centered">
      <div className="card">
        <h2>⚠️ {t('error_title')}</h2>
        <p className="error">{t('entry_load_error')}</p>
        <button type="button" onClick={() => window.location.reload()}>
          {t('mtonga_retry')}
        </button>
      </div>
    </main>,
  )
}
if (!tg?.initData) {
  document.documentElement.dataset.entry = 'public'
  void import('./features/entry/TelegramEntry')
    .then(({ TelegramEntry }) => {
      root.render(<TelegramEntry />)
    })
    .catch(showLoadError)
} else {
  void import('./app/App')
    .then(({ App }) => {
      root.render(<App />)
    })
    .catch(showLoadError)
}
