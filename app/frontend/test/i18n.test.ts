import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveLang, translator } from '../src/i18n/index.js'
import { en } from '../src/i18n/en.js'
import { ru } from '../src/i18n/ru.js'
import { zh } from '../src/i18n/zh.js'

test('every locale has the same translation keys', () => {
  const expected = Object.keys(en).sort()
  assert.deepEqual(Object.keys(ru).sort(), expected)
  assert.deepEqual(Object.keys(zh).sort(), expected)
})

test('Chinese Telegram locales resolve to Simplified Chinese', () => {
  assert.equal(resolveLang('zh'), 'zh')
  assert.equal(resolveLang('zh-CN'), 'zh')
  assert.equal(resolveLang('zh-Hans'), 'zh')
  assert.equal(translator('zh')('mtonga_tab_suggestions'), '建议')
  assert.equal(translator('zh')('issue_new'), '报告问题')
})

test('the personal content tab is named My Cards in every language', () => {
  assert.equal(translator('en')('my_contributions_title'), 'My Cards')
  assert.equal(translator('ru')('my_contributions_title'), 'Мои карточки')
  assert.equal(translator('zh')('my_contributions_title'), '我的卡片')
})

test('feed headings consistently put their count in parentheses after the label', () => {
  for (const [lang, cards, suggestions, issues] of [
    ['en', 'Cards', 'Suggestions', 'Issues'],
    ['ru', 'Карточки', 'Предложения', 'Проблемы'],
    ['zh', '卡片', '建议', '问题'],
  ] as const) {
    const t = translator(lang)
    for (const count of [0, 1, 12]) {
      const suffix = lang === 'zh' ? `（${count}）` : ` (${count})`
      assert.equal(t('mtonga_cards_count', { count }), cards + suffix)
      assert.equal(t('mtonga_count', { count }), suggestions + suffix)
      assert.equal(t('issue_count', { count }), issues + suffix)
    }
  }
})
