import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  SUGGESTION_TAGS,
  suggestionTagDefinition,
} from '../src/features/board/suggestion-tags.js'

test('suggestion tags use the centralized Telegram icon registry', () => {
  assert.deepEqual(
    SUGGESTION_TAGS.map(({ id }) => id),
    [
      'defi',
      'gifts',
      'telegram',
      'web3',
      'stars',
      'cocoon',
      'foundation',
      'fragment',
    ],
  )
  assert.equal(suggestionTagDefinition('stars')?.icon, 'tag-stars')
  assert.equal(suggestionTagDefinition('cocoon')?.icon, 'tag-cocoon')
  assert.equal(suggestionTagDefinition('foundation')?.icon, 'tag-foundation')
  assert.equal(
    SUGGESTION_TAGS.some(({ id }) => (id as string) === 'ton-dns'),
    false,
  )
})

test('suggestion tag pill styles do not collapse their nested icons', () => {
  const css = readFileSync(
    new URL('../src/features/board/mtonga.css', import.meta.url),
    'utf8',
  )
  assert.match(css, /\.suggestion-detail__tags\s*>\s*span\s*\{/)
  assert.doesNotMatch(css, /\.suggestion-detail__tags\s+span\s*\{/)
})
