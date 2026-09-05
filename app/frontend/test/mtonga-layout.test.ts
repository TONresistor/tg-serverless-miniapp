import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('search and tabs share a sticky header below the Telegram safe area', () => {
  const css = readFileSync(
    new URL('../src/features/board/mtonga.css', import.meta.url),
    'utf8',
  )
  const header = css.match(/\.mtonga-feed-header\s*\{([^}]+)\}/)?.[1] ?? ''
  assert.match(header, /position:\s*sticky/)
  assert.match(header, /top:\s*var\(--app-safe-top\)/)
  assert.match(header, /background:/)
})

test('the MTONGA card is displayed without an experimental feature gate', () => {
  const board = readFileSync(
    new URL('../src/features/board/MTonga.tsx', import.meta.url),
    'utf8',
  )
  const flags = readFileSync(
    new URL('../src/app/experimental-features.ts', import.meta.url),
    'utf8',
  )
  const profile = readFileSync(
    new URL('../src/features/profile/ProfilePage.tsx', import.meta.url),
    'utf8',
  )
  assert.match(board, /<header className="mtonga__hero">\s*<MTongaFlag\s*\/>/)
  assert.doesNotMatch(board, /showMtongaCard/)
  assert.doesNotMatch(flags, /mtonga-card|mtongaCard/)
  assert.doesNotMatch(
    profile,
    /experimental_mtonga_card|experimentalMtongaCard/,
  )
})
