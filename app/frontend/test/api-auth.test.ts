import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import {
  createSuggestionComment,
  fetchAvatar,
  listContent,
} from '../src/api/index.js'
import { call } from '../src/api/serverless.js'
import type { ServerlessError } from '../src/api/serverless.js'

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'window')
})
function install(
  handler: (
    name: string,
    input: Record<string, unknown>,
    callback: (error: ServerlessError | null, result?: unknown) => void,
  ) => void,
) {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { Telegram: { WebApp: { Serverless: { call: handler } } } },
  })
}
test('mixed feed passes business filters without client identity', async () => {
  install((name, input, done) => {
    assert.equal(name, 'listContent')
    assert.deepEqual(input, {
      kind: 'all',
      mine: false,
      sort: 'rating',
      limit: 20,
      q: 'wallet',
      cursor: 'page-two',
    })
    done(null, { items: [], total: 0, totals: { suggestions: 5, issues: 2 } })
  })
  assert.deepEqual(
    (await listContent('all', 'rating', 'wallet', 20, 'page-two')).totals,
    { suggestions: 5, issues: 2 },
  )
})
test('ownership filters use verified server identity instead of a supplied user ID', async () => {
  const inputs: Record<string, unknown>[] = []
  install((_name, input, done) => {
    inputs.push(input)
    done(null, { items: [], suggestions: [], issues: [], total: 0 })
  })
  await listContent('mine', 'newest', 'wallet')
  assert.deepEqual(inputs, [
    { kind: 'all', mine: true, sort: 'newest', limit: 20, q: 'wallet' },
  ])
  for (const input of inputs) {
    assert.equal('init_data' in input, false)
    assert.equal('user_id' in input, false)
  }
})
test('generic feed uses the selected suggestion or issue kind', async () => {
  const inputs: Record<string, unknown>[] = []
  install((_name, input, done) => {
    inputs.push(input)
    done(null, { suggestions: [], issues: [] })
  })
  await listContent('suggestion', 'rating', 'better TON')
  await listContent('issue', 'rating', 'wallet')
  assert.deepEqual(
    inputs.map((input) => input.kind),
    ['suggestion', 'issue'],
  )
})
test('avatar bytes travel as JSON without an API token or public file URL', async () => {
  install((name, input, done) => {
    assert.equal(name, 'getAvatar')
    assert.deepEqual(input, {})
    done(null, { base64: 'AQID', content_type: 'image/jpeg' })
  })
  const result = await fetchAvatar()
  assert.equal(result.type, 'image/jpeg')
  assert.deepEqual(
    new Uint8Array(await result.arrayBuffer()),
    new Uint8Array([1, 2, 3]),
  )
})
test('comment replies retain their parent id', async () => {
  install((name, input, done) => {
    assert.equal(name, 'createComment')
    assert.deepEqual(input, {
      kind: 'suggestion',
      id: 7,
      body: 'A reply',
      reply_to_comment_id: 12,
    })
    done(null, { comment: { id: 13 } })
  })
  await createSuggestionComment(7, 'A reply', 12)
})
test('aborted feed calls ignore late SDK replies', async () => {
  let callback:
    | ((error: ServerlessError | null, result?: unknown) => void)
    | undefined
  install((_name, _input, done) => {
    callback = done
  })
  const abort = new AbortController()
  const promise = call('listContent', {}, abort.signal)
  abort.abort()
  await assert.rejects(promise, { name: 'AbortError' })
  callback?.(null, { items: [] })
})
test('Serverless timeout rejects once and ignores a late SDK reply', async () => {
  const originalSetTimeout = globalThis.setTimeout
  const originalClearTimeout = globalThis.clearTimeout
  let expire: (() => void) | undefined
  globalThis.setTimeout = ((callback: TimerHandler) => {
    expire = callback as () => void
    return 1
  }) as typeof setTimeout
  globalThis.clearTimeout = (() => {}) as typeof clearTimeout
  try {
    let callback:
      | ((error: ServerlessError | null, result?: unknown) => void)
      | undefined
    install((_name, _input, done) => {
      callback = done
    })
    const request = call('listContent')
    expire?.()
    await assert.rejects(request, /timed out/i)
    callback?.(null, { items: [] })
  } finally {
    globalThis.setTimeout = originalSetTimeout
    globalThis.clearTimeout = originalClearTimeout
  }
})
test('missing SDK and endpoint errors fail explicitly', async () => {
  await assert.rejects(call('init'), /Serverless is unavailable/)
  install((_name, _input, done) =>
    done({ message: 'too many requests', type: 'ENDPOINT_ERROR' }),
  )
  await assert.rejects(call('createContent'), /too many requests/)
})
