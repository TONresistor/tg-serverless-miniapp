import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  GUIDE_TOUR_TARGETS,
  nextAvailableGuideStep,
  previousAvailableGuideStep,
} from '../src/features/guide-tour/guide-tour.js'

test('guide tour follows the board flow and skips unavailable cards', () => {
  assert.deepEqual(GUIDE_TOUR_TARGETS, ['tabs', 'search', 'contribute', 'card'])
  assert.equal(nextAvailableGuideStep(0, [true, true, true, true]), 1)
  assert.equal(nextAvailableGuideStep(2, [true, true, true, false]), null)
  assert.equal(nextAvailableGuideStep(1, [true, true, false, true]), 3)
  assert.equal(previousAvailableGuideStep(3, [true, true, false, true]), 1)
  assert.equal(previousAvailableGuideStep(0, [true, true, true, true]), null)
})

test('guide tour is available directly in Profile and uses stable board targets', () => {
  const read = (file: string) =>
    readFileSync(new URL('../src/' + file, import.meta.url), 'utf8')
  const main = read('app/Main.tsx')
  const profile = read('features/profile/ProfilePage.tsx')
  const board = read('features/board/MTonga.tsx')
  const tabs = read('features/board/FeedTabs.tsx')
  const card = read('features/board/SuggestionCard.tsx')
  const tour = read('features/guide-tour/WizardGuideTour.tsx')

  assert.match(
    profile,
    /label=\{t\('profile_guide_tour'\)\}[\s\S]*onClick=\{onStartGuideTour\}/,
  )
  assert.equal(profile.match(/profile_guide_tour/g)?.length, 1)
  assert.ok(
    profile.indexOf('profile_guide_tour') <
      profile.indexOf("sheet === 'experimental'"),
  )
  assert.match(main, /setTab\('mtonga'\)[\s\S]*setGuideTourOpen\(true\)/)
  for (const target of ['search', 'contribute'])
    assert.match(board, new RegExp(`data-guide-tour="${target}"`))
  assert.match(tabs, /data-guide-tour="tabs"/)
  assert.match(card, /guideTarget \? 'card'/)
  assert.doesNotMatch(tour, /initDataUnsafe/)
  assert.match(tour, /t\('guide_tour_skip'\)/)
  assert.doesNotMatch(tour, /setAnchor\(null\)/)
  assert.match(
    tour,
    /update\(\)\s*frame = window\.requestAnimationFrame\(update\)/,
  )
})
