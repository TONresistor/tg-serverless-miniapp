interface TelegramThemeParams {
  bg_color?: string
  text_color?: string
  hint_color?: string
  link_color?: string
  button_color?: string
  button_text_color?: string
  secondary_bg_color?: string
  header_bg_color?: string
  accent_text_color?: string
  destructive_text_color?: string
  section_bg_color?: string
  subtitle_text_color?: string
}

interface TelegramMainButton {
  text: string
  isVisible: boolean
  isActive: boolean
  setText(text: string): TelegramMainButton
  onClick(cb: () => void): TelegramMainButton
  offClick(cb: () => void): TelegramMainButton
  show(): TelegramMainButton
  hide(): TelegramMainButton
  enable(): TelegramMainButton
  disable(): TelegramMainButton
}

interface TelegramHapticFeedback {
  impactOccurred(
    style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft',
  ): TelegramHapticFeedback
  notificationOccurred(
    type: 'error' | 'success' | 'warning',
  ): TelegramHapticFeedback
  selectionChanged(): TelegramHapticFeedback
}

interface TelegramBackButton {
  isVisible: boolean
  show(): TelegramBackButton
  hide(): TelegramBackButton
  onClick(cb: () => void): TelegramBackButton
  offClick(cb: () => void): TelegramBackButton
}

interface TelegramCloudStorage {
  setItem(
    key: string,
    value: string,
    cb?: (err: Error | null, ok: boolean) => void,
  ): void
  getItem(
    key: string,
    cb: (err: Error | null, value: string | undefined) => void,
  ): void
  removeItem(key: string, cb?: (err: Error | null, ok: boolean) => void): void
  getKeys(cb: (err: Error | null, keys: string[]) => void): void
}

interface SafeAreaInset {
  top: number
  bottom: number
  left: number
  right: number
}

export interface TelegramWebApp {
  Serverless?: {
    call<T>(
      name: string,
      input: Record<string, unknown>,
      callback: (
        error: {
          message: string
          type: string
          parameters?: Record<string, unknown>
        } | null,
        result?: T,
      ) => void,
    ): void
  }
  initData: string
  version: string
  platform: string
  colorScheme: 'light' | 'dark'
  themeParams: TelegramThemeParams
  viewportHeight: number
  viewportStableHeight: number
  isExpanded: boolean
  // Telegram 8.0+
  isFullscreen?: boolean
  safeAreaInset?: SafeAreaInset
  contentSafeAreaInset?: SafeAreaInset
  MainButton: TelegramMainButton
  BackButton: TelegramBackButton
  HapticFeedback: TelegramHapticFeedback
  CloudStorage?: TelegramCloudStorage
  ready(): void
  expand(): void
  close(): void
  isVersionAtLeast(version: string): boolean
  onEvent(event: string, handler: (...args: unknown[]) => void): void
  offEvent(event: string, handler: (...args: unknown[]) => void): void
  showAlert(message: string, cb?: () => void): void
  openTelegramLink(url: string): void
  // Telegram 8.0+
  shareMessage?(msgId: string, callback?: (success: boolean) => void): void
  // Telegram 6.9+
  requestWriteAccess?(callback?: (granted: boolean) => void): void
  openLink(url: string, options?: { try_instant_view?: boolean }): void
  requestFullscreen?(): void
  exitFullscreen?(): void
  setHeaderColor?(color: string): void
  // Telegram 9.6+
  requestChat?(prepared_id: string, cb?: (sent: boolean) => void): void
  showPopup?(
    params: {
      title?: string
      message: string
      buttons?: Array<{ id?: string; type?: string; text?: string }>
    },
    cb?: (id: string) => void,
  ): void
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp
    }
  }
}

export {}
