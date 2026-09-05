import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import type { TelegramWebApp } from '../src/telegram/types.js'
import { getCloudItem, setCloudItem } from '../src/telegram/cloud-storage.js'

const local = new Map<string, string>()
const originalLocalStorage = Object.getOwnPropertyDescriptor(
  globalThis,
  'localStorage',
)
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')

function install(
  cloud: Partial<NonNullable<TelegramWebApp['CloudStorage']>> | undefined,
  storage: Pick<Storage, 'getItem' | 'setItem'> = {
    getItem: (key) => local.get(key) ?? null,
    setItem: (key, value) => {
      local.set(key, value)
    },
  },
) {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage,
  })
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      setTimeout,
      clearTimeout,
      Telegram: { WebApp: { CloudStorage: cloud } },
    },
  })
}

afterEach(() => {
  local.clear()
  if (originalLocalStorage)
    Object.defineProperty(globalThis, 'localStorage', originalLocalStorage)
  else Reflect.deleteProperty(globalThis, 'localStorage')
  if (originalWindow)
    Object.defineProperty(globalThis, 'window', originalWindow)
  else Reflect.deleteProperty(globalThis, 'window')
})

test('CloudStorage timeout uses cached preference and throwing localStorage is safe', async () => {
  let expire: (() => void) | undefined
  const oldSetTimeout = globalThis.setTimeout
  const oldClearTimeout = globalThis.clearTimeout
  globalThis.setTimeout = ((callback: TimerHandler) => {
    expire = callback as () => void
    return 1
  }) as typeof setTimeout
  globalThis.clearTimeout = (() => {}) as typeof clearTimeout
  try {
    install({ getItem: () => {} })
    local.set('_tg_cs_fallback:onboarded', '1')
    const result = getCloudItem('onboarded')
    expire?.()
    assert.equal(await result, '1')
    install(undefined, {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    })
    assert.equal(await getCloudItem('missing'), null)
    assert.equal(await setCloudItem('key', 'value'), false)
  } finally {
    globalThis.setTimeout = oldSetTimeout
    globalThis.clearTimeout = oldClearTimeout
  }
})

test('successful empty CloudStorage value does not restore stale cached preference', async () => {
  install({
    getItem: (
      _key: string,
      callback: (err: Error | null, value?: string) => void,
    ) => callback(null, ''),
  })
  local.set('_tg_cs_fallback:onboarded', '1')
  assert.equal(await getCloudItem('onboarded'), null)
})

test('successful CloudStorage preference refreshes the fallback cache', async () => {
  install({
    getItem: (
      _key: string,
      callback: (err: Error | null, value?: string) => void,
    ) => callback(null, '1'),
  })
  assert.equal(await getCloudItem('onboarded'), '1')
  assert.equal(local.get('_tg_cs_fallback:onboarded'), '1')
})

test('late cloud reads do not overwrite a newer cached preference', async () => {
  let callback: ((error: Error | null, value?: string) => void) | undefined
  let expire: (() => void) | undefined
  const oldSetTimeout = globalThis.setTimeout
  const oldClearTimeout = globalThis.clearTimeout
  globalThis.setTimeout = ((fn: TimerHandler) => {
    expire = fn as () => void
    return 1
  }) as typeof setTimeout
  globalThis.clearTimeout = (() => {}) as typeof clearTimeout
  try {
    install({
      getItem: (_key, done) => {
        callback = done
      },
    })
    local.set('_tg_cs_fallback:lang', 'ru')
    const result = getCloudItem('lang')
    expire?.()
    assert.equal(await result, 'ru')
    local.set('_tg_cs_fallback:lang', 'zh')
    callback?.(null, 'en')
    assert.equal(local.get('_tg_cs_fallback:lang'), 'zh')
  } finally {
    globalThis.setTimeout = oldSetTimeout
    globalThis.clearTimeout = oldClearTimeout
  }
})
