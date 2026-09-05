import assert from 'node:assert/strict'
import test from 'node:test'
import { contributionPromptMode } from '../src/features/board/contribution-prompt.js'

test('without a search, creation uses a single Contribute link, never filled buttons', () => {
  for (const query of ['', '  ']) {
    for (const nextCursor of [null, 'next-page']) {
      assert.equal(
        contributionPromptMode({
          query,
          search: '',
          loading: false,
          nextCursor,
        }),
        'contribute',
      )
    }
  }
})

test('search creation buttons appear only at the end of the results, including no matches', () => {
  const search = { query: ' TON ', search: 'TON', loading: false }
  assert.equal(
    contributionPromptMode({ ...search, nextCursor: null }),
    'buttons',
  )
  assert.equal(
    contributionPromptMode({ ...search, nextCursor: 'next-page' }),
    null,
  )
})

test('creation prompts stay hidden while search results are loading or stale', () => {
  assert.equal(
    contributionPromptMode({
      query: 'TON',
      search: 'TON',
      loading: true,
      nextCursor: null,
    }),
    null,
  )
  assert.equal(
    contributionPromptMode({
      query: 'TON',
      search: '',
      loading: false,
      nextCursor: null,
    }),
    null,
  )
  assert.equal(
    contributionPromptMode({
      query: '',
      search: 'TON',
      loading: false,
      nextCursor: null,
    }),
    null,
  )
})
