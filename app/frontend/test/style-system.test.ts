import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import test from 'node:test'

const sourceRoot = new URL('../src/', import.meta.url)
const read = (path: string) => readFileSync(new URL(path, sourceRoot), 'utf8')
const tokens = read('styles/tokens.css')
const mtonga = read('features/board/mtonga.css')

function rule(css: string, selector: string): string {
  for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const header = match[1].replace(/\/\*[\s\S]*?\*\//g, '').trim()
    if (header === selector) return match[2]
  }
  assert.fail('Missing rule: ' + selector)
}

function declarations(body: string): Record<string, string> {
  return Object.fromEntries(
    [...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((match) => [
      match[1],
      match[2].trim(),
    ]),
  )
}

function theme(params: Record<string, string>, dark = false) {
  const values = {
    ...declarations(rule(tokens, ':root')),
    ...(dark ? declarations(rule(tokens, "html[data-theme='dark']")) : {}),
    ...params,
  }
  const resolveValue = (value: string): string => {
    const variable = value.match(/^var\((--[\w-]+)(?:,\s*([\s\S]+))?\)$/)
    if (!variable) return value
    const next = values[variable[1]] ?? variable[2]
    assert.notEqual(next, undefined, 'Missing variable: ' + variable[1])
    return resolveValue(next!)
  }
  return (name: string) => resolveValue('var(' + name + ')')
}

test('section fallback follows Telegram in both light and dark themes', () => {
  for (const [dark, bg, text, secondary] of [
    [false, '#ffffff', '#111111', '#f2f2f7'],
    [true, '#17212b', '#ffffff', '#232e3c'],
  ] as const) {
    const basic = { '--tg-theme-bg-color': bg, '--tg-theme-text-color': text }
    const withSecondary = {
      ...basic,
      '--tg-theme-secondary-bg-color': secondary,
    }
    assert.equal(theme(basic, dark)('--section-bg'), bg)
    assert.equal(theme(withSecondary, dark)('--section-bg'), secondary)
    assert.equal(
      theme(
        { ...withSecondary, '--tg-theme-section-bg-color': '#345678' },
        dark,
      )('--section-bg'),
      '#345678',
    )
    assert.equal(theme(basic, dark)('--text'), text)
  }
  assert.equal(theme({})('--bg'), '#fff')
  assert.equal(theme({}, true)('--bg'), '#171b20')
  assert.equal(theme({}, true)('--text'), '#f5f5f7')
  assert.match(
    rule(mtonga, '.suggestion-chat__bot'),
    /background: var\(--section-bg\)/,
  )
  assert.match(
    rule(mtonga, '.suggestion-chat__user'),
    /var\(--section-bg\) 95%/,
  )
})

test('custom themes keep link and button colors independent and correctly paired', () => {
  const custom = theme({
    '--tg-theme-link-color': '#ed81c5',
    '--tg-theme-button-color': '#ffd166',
    '--tg-theme-button-text-color': '#17212b',
  })
  assert.equal(custom('--link'), '#ed81c5')
  assert.equal(custom('--accent'), '#ffd166')
  assert.equal(custom('--accent-text'), '#17212b')
  assert.match(
    rule(mtonga, '.suggestion-detail__actions .suggestion-detail__action--on'),
    /color: var\(--accent-text\);\s*background: var\(--accent\)/,
  )
  assert.match(
    rule(
      mtonga,
      '.suggestion-tag-option--selected .suggestion-tag-option__check',
    ),
    /background: var\(--accent\)/,
  )
  assert.match(
    rule(mtonga, '.suggestion-tag-option__check'),
    /color: var\(--accent-text\)/,
  )
  assert.match(
    rule(mtonga, '.mtonga .mtonga-contribute-hint'),
    /color: var\(--link\)/,
  )
  assert.match(
    rule(read('styles/navigation.css'), '.bottomnav__tab--active'),
    /color: var\(--link\)/,
  )
  assert.equal(custom('--mtonga-suggestion-color'), '#0098ea')
  assert.equal(custom('--mtonga-issue-color'), '#34c759')
})

test('metadata uses subtitle color with a hint fallback; placeholders remain hints', () => {
  assert.equal(
    theme({ '--tg-theme-hint-color': '#8899aa' })('--subtitle'),
    '#8899aa',
  )
  assert.equal(
    theme({
      '--tg-theme-hint-color': '#8899aa',
      '--tg-theme-subtitle-text-color': '#778899',
    })('--subtitle'),
    '#778899',
  )
  for (const selector of [
    '.suggestion-card__context',
    '.suggestion-detail__author',
    '.suggestion-comment time',
  ]) {
    assert.match(rule(mtonga, selector), /color: var\(--subtitle\)/)
  }
  assert.match(
    rule(mtonga, '.mtonga-search input::placeholder'),
    /color: var\(--hint\)/,
  )
})

test('search keeps its theme-derived tint while text composers use the section background', () => {
  assert.match(
    rule(mtonga, '.mtonga-search'),
    /background: var\(--section-bg\)/,
  )
  assert.match(
    rule(mtonga, '.mtonga-feed-header .mtonga-search'),
    /background: color-mix\(in srgb, var\(--text\) 5%, var\(--secondary-bg\)\)/,
  )
  assert.match(
    rule(mtonga, '.suggestion-writebar__inner,\n.suggestion-comment-compose'),
    /background: var\(--section-bg\)/,
  )
})

test('shared styles are imported once and do not depend on Community or Profile', () => {
  const entry = read('styles.css')
  for (const name of [
    'tokens',
    'base',
    'shell',
    'settings',
    'sheets',
    'navigation',
    'onboarding',
  ]) {
    assert.equal(entry.split('./styles/' + name + '.css').length - 1, 1)
  }
  rule(read('styles/settings.css'), '.nav-row')
  rule(read('styles/settings.css'), '.sw')
  rule(read('styles/sheets.css'), '.sheet')
  rule(read('styles/sheets.css'), '.sheet__title')
  rule(read('styles/base.css'), '.telegram-icon')
  for (const page of ['features/profile/ProfilePage.css']) {
    assert.doesNotMatch(read(page), /(?:^|\n)\.(?:nav-row|sheet|sw|opt)\s*\{/)
  }
})

test('components consume semantic tokens instead of duplicating Telegram fallbacks', () => {
  for (const file of readdirSync(sourceRoot, { recursive: true }) as string[]) {
    if (!file.endsWith('.css') || file === 'styles/tokens.css') continue
    assert.doesNotMatch(
      read(file),
      /--tg-theme-|--app-accent|--tg-viewport-height/,
      file,
    )
  }
  assert.doesNotMatch(tokens, /prefers-color-scheme/)
})

test('fixed conversation screens use the stable viewport without changing composer geometry', () => {
  assert.equal(
    declarations(rule(tokens, ':root'))['--app-viewport-height'],
    'min(100dvh, var(--tg-viewport-stable-height, 100dvh))',
  )
  assert.match(
    rule(read('styles/shell.css'), '.screen'),
    /height: var\(--app-viewport-height\)/,
  )
  for (const selector of ['.suggestion-wizard', '.suggestion-detail']) {
    assert.match(rule(mtonga, selector), /height: var\(--app-viewport-height\)/)
  }
  assert.match(rule(mtonga, '.suggestion-detail__footer'), /padding-top: 8px/)
  assert.match(
    rule(mtonga, '.suggestion-writebar,\n.suggestion-detail__footer'),
    /calc\(var\(--app-safe-bottom\) \+ var\(--app-bottom-space\)\)/,
  )
  const textarea = rule(
    mtonga,
    '.suggestion-writebar textarea,\n.suggestion-comment-compose textarea',
  )
  assert.match(textarea, /min-height: 52px/)
  assert.match(textarea, /max-height: 118px/)
  assert.match(textarea, /line-height: 22px/)
  assert.match(
    rule(read('styles/settings.css'), '.nav-row'),
    /min-height: 52px;\s*padding: 0 16px/,
  )
  assert.match(rule(read('styles/sheets.css'), '.sheet'), /border-radius: 30px/)
})
