import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import {
  INVITE_SHARE_MESSAGE,
  inviteShareFallbackURL,
  miniAppInviteDeepLink,
  shareInvite,
} from '../src/features/profile/invite-share.js'

const miniAppURL = 'https://t.me/MTONGA2bot'

function installTelegram(overrides: Record<string, unknown> = {}) {
  const opened: string[] = []
  const shared: string[] = []
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      Telegram: {
        WebApp: {
          isVersionAtLeast: () => true,
          openTelegramLink: (url: string) => opened.push(url),
          shareMessage: (id: string) => shared.push(id),
          ...overrides,
        },
      },
    },
  })
  return { opened, shared }
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'window')
})

test('invite uses Telegram native sharing with a server-prepared message', async () => {
  const state = installTelegram()
  Object.assign(window.Telegram!.WebApp, {
    Serverless: {
      call: (
        name: string,
        input: Record<string, unknown>,
        done: (error: null, result: unknown) => void,
      ) => {
        assert.equal(name, 'prepareInvite')
        assert.equal('init_data' in input, false)
        done(null, { prepared_message_id: 'prepared-invite' })
      },
    },
  })

  await shareInvite(miniAppURL)
  assert.deepEqual(state.shared, ['prepared-invite'])
  assert.deepEqual(state.opened, [])
})

test('invite fallback keeps the message and Main Mini App deep link', async () => {
  const state = installTelegram({ isVersionAtLeast: () => false })
  await shareInvite(miniAppURL)

  const fallback = inviteShareFallbackURL(miniAppURL)
  assert.deepEqual(state.opened, [fallback])
  assert.equal(
    miniAppInviteDeepLink(miniAppURL),
    'https://t.me/MTONGA2bot?startapp',
  )
  assert.equal(
    new URL(fallback!).searchParams.get('text'),
    INVITE_SHARE_MESSAGE,
  )
})
