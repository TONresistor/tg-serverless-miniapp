import assert from 'node:assert/strict'
import test from 'node:test'
import { contributionSteps } from '../src/features/board/contribution-steps.js'

test('Contribute starts with a type question before any content fields', () => {
  assert.deepEqual(
    contributionSteps(null, true).map(({ id }) => id),
    ['kind'],
  )
})

test('choosing a type requires a duplicate check before the content questions', () => {
  assert.deepEqual(
    contributionSteps('issue', true).map(({ id }) => id),
    ['kind', 'duplicates', 'problem', 'why', 'title', 'tags', 'confirm'],
  )
  assert.deepEqual(
    contributionSteps('suggestion', true).map(({ id }) => id),
    ['kind', 'duplicates', 'what', 'why', 'how', 'title', 'tags', 'confirm'],
  )
})

test('direct creation skips type selection but still asks the user to check for duplicates', () => {
  assert.deepEqual(
    contributionSteps('issue', false).map(({ id }) => id),
    ['duplicates', 'problem', 'why', 'title', 'tags', 'confirm'],
  )
  assert.deepEqual(
    contributionSteps('suggestion', false).map(({ id }) => id),
    ['duplicates', 'what', 'why', 'how', 'title', 'tags', 'confirm'],
  )
})
