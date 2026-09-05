import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isNearBottom,
  textareaHeight,
} from '../src/features/board/useConversationLayout.js'

test('composers grow from two lines to five before scrolling', () => {
  assert.equal(textareaHeight(0), 52)
  assert.equal(textareaHeight(52), 52)
  assert.equal(textareaHeight(74), 74)
  assert.equal(textareaHeight(118), 118)
  assert.equal(textareaHeight(300), 118)
})

test('conversation follows resizing only when the reader is near the bottom', () => {
  assert.equal(isNearBottom(200, 400, 0), true)
  assert.equal(isNearBottom(1200, 400, 800), true)
  assert.equal(isNearBottom(1200, 400, 790), true)
  assert.equal(isNearBottom(1200, 400, 500), false)
})
