import assert from 'node:assert/strict'
import test from 'node:test'
import {
  contentDeepLink,
  contentTargetFromStartParam,
} from '../src/features/board/suggestion-links.js'

const miniAppURL = 'https://t.me/MTONGA2bot'

test('suggestion links use the registered Telegram Mini App deep link', () => {
  assert.equal(
    contentDeepLink('suggestion', 42, miniAppURL),
    'https://t.me/MTONGA2bot?startapp=suggestion_42',
  )
  assert.equal(contentDeepLink('suggestion', 0, miniAppURL), null)
  assert.equal(
    contentDeepLink('suggestion', 42, 'https://example.com/app'),
    null,
  )
})

test('issue links open the Issues list directly', () => {
  assert.deepEqual(contentTargetFromStartParam('issue_24'), {
    kind: 'issue',
    id: 24,
  })
  assert.equal(
    contentDeepLink('issue', 24, miniAppURL),
    'https://t.me/MTONGA2bot?startapp=issue_24',
  )
  assert.equal(contentTargetFromStartParam('issue_0'), null)
})

test('content start parameters accept only positive safe integer ids', () => {
  assert.deepEqual(contentTargetFromStartParam('suggestion_42'), {
    kind: 'suggestion',
    id: 42,
  })
  for (const value of [
    'suggestion_0',
    'suggestion_-1',
    'suggestion_1?x=secret',
    'suggestion_99999999999999999999',
  ]) {
    assert.equal(contentTargetFromStartParam(value), null)
  }
})
