import assert from 'node:assert/strict'
import test from 'node:test'
import { verifiedPhotoURL } from '../src/components/Avatar.js'
import { createNotificationAccess } from '../src/features/notifications/notification-access.js'

function setup(initiallyAllowed = false, storage = new Map<string, string>()) {
  let callback: ((granted: boolean) => void) | undefined
  const calls = { requests: 0, allowed: 0, opened: '' }
  const tg = {
    isVersionAtLeast: (version: string): boolean => version === '6.9',
    requestWriteAccess: (cb?: (granted: boolean) => void) => {
      calls.requests++
      callback = cb
    },
    openTelegramLink: (url: string) => {
      calls.opened = url
    },
  }
  const access = createNotificationAccess({
    userID: 42,
    initiallyAllowed,
    botURL: 'https://t.me/MTONGA2bot',
    getWebApp: () => tg,
    storage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => {
        storage.set(key, value)
      },
      removeItem: (key) => {
        storage.delete(key)
      },
    },
    onAllowed: () => {
      calls.allowed++
    },
  })
  return {
    access,
    calls,
    tg,
    storage,
    answer: (granted: boolean) => callback?.(granted),
  }
}

test('write access is requested synchronously once, and an accepted request is not repeated', () => {
  const s = setup()
  s.access.request()
  s.access.request()
  assert.equal(s.calls.requests, 1)
  s.answer(true)
  assert.equal(s.calls.allowed, 1)
  s.access.request(true)
  assert.equal(s.calls.requests, 1)
})

test('a known server grant skips the permission popup', () => {
  const s = setup(true)
  s.access.request()
  assert.equal(s.calls.requests, 0)
})

test('refusal survives reopening, but the explicit Profile action can request again', () => {
  const first = setup()
  first.access.request()
  first.answer(false)
  assert.equal(first.calls.allowed, 0)
  first.access.request()
  assert.equal(first.calls.requests, 1)
  const second = setup(false, first.storage)
  second.access.request()
  assert.equal(second.calls.requests, 0)
  second.access.request(true)
  assert.equal(second.calls.requests, 1)
  second.answer(true)
  assert.equal(second.storage.size, 0)
})

test('older clients only open the bot from the explicit Profile action', () => {
  const s = setup()
  s.tg.isVersionAtLeast = () => false
  s.access.request()
  assert.equal(s.calls.opened, '')
  s.access.request(true)
  assert.equal(s.calls.opened, 'https://t.me/MTONGA2bot')
})

test('SDK errors do not block the action or leave the prompt locked', () => {
  const s = setup()
  s.tg.requestWriteAccess = () => {
    throw new Error('popup unavailable')
  }
  assert.doesNotThrow(() => s.access.request())
  let requested = false
  s.tg.requestWriteAccess = () => {
    requested = true
  }
  s.access.request()
  assert.equal(requested, true)
  s.access.dispose()
})

test('permission timeout unlocks requests and stale callbacks cannot settle a newer request', () => {
  const originalSetTimeout = globalThis.setTimeout
  const originalClearTimeout = globalThis.clearTimeout
  let expire: (() => void) | undefined
  globalThis.setTimeout = ((callback: TimerHandler) => {
    expire = callback as () => void
    return 1
  }) as typeof setTimeout
  globalThis.clearTimeout = (() => {}) as typeof clearTimeout
  try {
    const callbacks: Array<(granted: boolean) => void> = []
    const s = setup()
    s.tg.requestWriteAccess = (callback) => {
      if (callback) callbacks.push(callback)
    }
    s.access.request()
    const stale = callbacks[0]
    expire?.()
    s.access.request()
    stale(true)
    assert.equal(s.calls.allowed, 0)
    callbacks[1](false)
    assert.equal(s.calls.allowed, 0)
    assert.equal(s.storage.size, 1)
  } finally {
    globalThis.setTimeout = originalSetTimeout
    globalThis.clearTimeout = originalClearTimeout
  }
})

test('profile photos accept HTTPS URLs from the verified user, rejecting unsafe schemes', () => {
  assert.equal(
    verifiedPhotoURL('https://t.me/i/userpic/320/photo.svg'),
    'https://t.me/i/userpic/320/photo.svg',
  )
  for (const url of [
    undefined,
    '',
    'not-a-url',
    'javascript:alert(1)',
    'data:image/svg+xml,a',
    'http://t.me/photo',
    'https://name:password@t.me/photo',
  ]) {
    assert.equal(verifiedPhotoURL(url), '')
  }
})
