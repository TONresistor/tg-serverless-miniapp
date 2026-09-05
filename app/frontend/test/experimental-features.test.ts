import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ADMIN_FEATURE_TAP_COUNT,
  adminFeaturesKey,
  adminModeKey,
  EXPERIMENTAL_FEATURE_TAP_COUNT,
  experimentalFeaturesKey,
  shouldUnlockAdminFeatures,
  shouldUnlockExperimentalFeatures,
  welcomeReplayKey,
} from '../src/app/experimental-features.js'

test('experimental features unlock after seven consecutive profile taps', () => {
  assert.equal(EXPERIMENTAL_FEATURE_TAP_COUNT, 7)
  assert.equal(shouldUnlockExperimentalFeatures(6), false)
  assert.equal(shouldUnlockExperimentalFeatures(7), true)
  assert.equal(
    experimentalFeaturesKey(42),
    'tonofdevs:experimental:profile-unlocked:42',
  )
  assert.equal(welcomeReplayKey(42), 'tonofdevs:experimental:replay-welcome:42')
})

test('admin features unlock only for a verified admin after nine taps', () => {
  assert.equal(ADMIN_FEATURE_TAP_COUNT, 9)
  assert.equal(shouldUnlockAdminFeatures(8, true), false)
  assert.equal(shouldUnlockAdminFeatures(9, true), true)
  assert.equal(shouldUnlockAdminFeatures(9, false), false)
  assert.equal(adminFeaturesKey(42), 'tonofdevs:admin:profile-unlocked:42')
  assert.equal(adminModeKey(42), 'tonofdevs:admin:mode:42')
})
