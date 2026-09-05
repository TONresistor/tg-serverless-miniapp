import type { TelegramWebApp } from './types'

type ThemeSource = Pick<TelegramWebApp, 'colorScheme' | 'onEvent' | 'offEvent'>
type ThemeRoot = { dataset: { theme?: string } }

// Install before React renders to avoid a theme flash.
export function installTelegramTheme(
  tg: ThemeSource | undefined,
  root: ThemeRoot,
): () => void {
  if (!tg) return () => {}
  const apply = () => {
    root.dataset.theme = tg.colorScheme
  }
  apply()
  tg.onEvent('themeChanged', apply)
  return () => tg.offEvent('themeChanged', apply)
}
