import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import {
  contentShareFallbackURL,
  shareContent,
} from '../src/features/board/suggestion-share.js'

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

test('native Telegram share uses a backend-prepared message', async () => {
  const state = installTelegram()
  Object.assign(window.Telegram!.WebApp, {
    Serverless: {
      call: (
        name: string,
        input: Record<string, unknown>,
        done: (error: null, result: unknown) => void,
      ) => {
        assert.equal(name, 'prepareContent')
        assert.equal('init_data' in input, false)
        done(null, { prepared_message_id: 'prepared-7' })
      },
    },
  })

  await shareContent('suggestion', 7, 'A better TON', miniAppURL)
  assert.deepEqual(state.shared, ['prepared-7'])
  assert.deepEqual(state.opened, [])
})

test('unsupported clients fall back to a short Telegram share URL', async () => {
  const state = installTelegram({ isVersionAtLeast: () => false })
  await shareContent('suggestion', 7, ' A   better TON ', miniAppURL)

  assert.deepEqual(state.shared, [])
  assert.deepEqual(state.opened, [
    contentShareFallbackURL('suggestion', 7, 'A better TON', miniAppURL),
  ])
  const fallback = new URL(state.opened[0]!)
  assert.equal(
    fallback.searchParams.get('url'),
    'https://t.me/MTONGA2bot?startapp=suggestion_7',
  )
})

test('issues use their own prepared share endpoint and deep link', async () => {
  const state = installTelegram()
  Object.assign(window.Telegram!.WebApp, {
    Serverless: {
      call: (
        name: string,
        input: Record<string, unknown>,
        done: (error: null, result: unknown) => void,
      ) => {
        assert.equal(name, 'prepareContent')
        assert.equal('init_data' in input, false)
        done(null, { prepared_message_id: 'prepared-issue-9' })
      },
    },
  })

  await shareContent('issue', 9, 'Wallet issue', miniAppURL)
  assert.deepEqual(state.shared, ['prepared-issue-9'])
  assert.equal(
    new URL(
      contentShareFallbackURL('issue', 9, 'Wallet issue', miniAppURL)!,
    ).searchParams.get('url'),
    'https://t.me/MTONGA2bot?startapp=issue_9',
  )
})
