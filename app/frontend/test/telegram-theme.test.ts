import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { installTelegramTheme } from '../src/telegram/theme.js'

function themeSource(scheme: 'light' | 'dark') {
  const listeners = new Set<() => void>()
  return {
    colorScheme: scheme,
    listeners,
    onEvent(event: string, handler: () => void) {
      assert.equal(event, 'themeChanged')
      listeners.add(handler)
    },
    offEvent(event: string, handler: () => void) {
      assert.equal(event, 'themeChanged')
      listeners.delete(handler)
    },
  }
}

test('theme is applied synchronously and follows Telegram changes', () => {
  const tg = themeSource('dark')
  const root = { dataset: { theme: 'light' } }
  const dispose = installTelegramTheme(tg, root)
  assert.equal(root.dataset.theme, 'dark')
  assert.equal(tg.listeners.size, 1)
  tg.colorScheme = 'light'
  tg.listeners.forEach((handler) => handler())
  assert.equal(root.dataset.theme, 'light')
  dispose()
})

test('cleanup and reinstallation do not accumulate theme listeners', () => {
  const tg = themeSource('light')
  const root = { dataset: { theme: '' } }
  const dispose = installTelegramTheme(tg, root)
  dispose()
  assert.equal(tg.listeners.size, 0)
  tg.colorScheme = 'dark'
  tg.listeners.forEach((handler) => handler())
  assert.equal(root.dataset.theme, 'light')
  const disposeAgain = installTelegramTheme(tg, root)
  assert.equal(root.dataset.theme, 'dark')
  assert.equal(tg.listeners.size, 1)
  disposeAgain()
  assert.equal(tg.listeners.size, 0)
})

test('without Telegram the installer leaves the neutral CSS fallback alone', () => {
  const root = { dataset: {} }
  installTelegramTheme(undefined, root)()
  assert.deepEqual(root.dataset, {})
})

test('theme ownership is in the entrypoint, not a second React effect', () => {
  const read = (file: string) =>
    readFileSync(new URL('../src/' + file, import.meta.url), 'utf8')
  const entry = read('main.tsx')
  assert.ok(
    entry.indexOf('installTelegramTheme(tg') < entry.indexOf('root.render('),
  )
  assert.match(entry, /import\.meta\.hot\.dispose\(disposeTheme\)/)
  assert.doesNotMatch(read('app/App.tsx'), /themeChanged|dataset\.theme/)
  assert.doesNotMatch(read('telegram/theme.ts'), /matchMedia|setProperty/)
})
