import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { en } from './en'
import { ru } from './ru'
import { zh } from './zh'

export type Lang = 'en' | 'ru' | 'zh'

export function resolveLang(code?: string): Lang {
  const normalized = code?.toLowerCase() ?? ''
  if (normalized.startsWith('ru')) return 'ru'
  if (normalized.startsWith('zh')) return 'zh'
  return 'en'
}

const STRINGS = { en, ru, zh } as const

export type TKey = keyof (typeof STRINGS)['en']
export type TFn = (
  key: TKey,
  params?: Record<string, string | number>,
) => string

export function translator(lang: Lang): TFn {
  const table = STRINGS[lang] as Record<TKey, string>
  return (key, params) => {
    let s = table[key] ?? STRINGS.en[key]
    if (params) {
      for (const [k, v] of Object.entries(params))
        s = s.split(`{${k}}`).join(String(v))
    }
    return s
  }
}

const I18nContext = createContext<{ lang: Lang; t: TFn }>({
  lang: 'en',
  t: translator('en'),
})

export function I18nProvider({
  lang,
  children,
}: {
  lang: Lang
  children: ReactNode
}) {
  const value = useMemo(() => ({ lang, t: translator(lang) }), [lang])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useT() {
  return useContext(I18nContext)
}
