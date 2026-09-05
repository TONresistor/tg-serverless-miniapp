import { useCallback, useRef, useState } from 'react'

export const EXPERIMENTAL_FEATURE_TAP_COUNT = 7
export const ADMIN_FEATURE_TAP_COUNT = 9

export function experimentalFeaturesKey(userId: number): string {
  return `tonofdevs:experimental:profile-unlocked:${userId}`
}

export function welcomeReplayKey(userId: number): string {
  return `tonofdevs:experimental:replay-welcome:${userId}`
}

export function adminFeaturesKey(userId: number): string {
  return `tonofdevs:admin:profile-unlocked:${userId}`
}

export function adminModeKey(userId: number): string {
  return `tonofdevs:admin:mode:${userId}`
}

export function shouldUnlockExperimentalFeatures(taps: number): boolean {
  return taps >= EXPERIMENTAL_FEATURE_TAP_COUNT
}

export function shouldUnlockAdminFeatures(
  taps: number,
  isAdmin: boolean,
): boolean {
  return isAdmin && taps >= ADMIN_FEATURE_TAP_COUNT
}

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function writeFlag(key: string, enabled: boolean): void {
  try {
    localStorage.setItem(key, enabled ? '1' : '0')
  } catch {}
}

export function readWelcomeReplay(userId: number): boolean {
  return readFlag(welcomeReplayKey(userId))
}

export function useExperimentalFeatures(userId: number, isAdmin: boolean) {
  const [unlocked, setUnlocked] = useState(() =>
    readFlag(experimentalFeaturesKey(userId)),
  )
  const [welcomeReplayEnabled, setWelcomeReplayEnabledState] = useState(() =>
    readWelcomeReplay(userId),
  )
  const [adminUnlocked, setAdminUnlocked] = useState(
    () => isAdmin && readFlag(adminFeaturesKey(userId)),
  )
  const [adminModeEnabled, setAdminModeEnabledState] = useState(
    () => isAdmin && readFlag(adminModeKey(userId)),
  )
  const consecutiveProfileTaps = useRef(0)

  const registerProfileTap = useCallback(() => {
    if (unlocked && (!isAdmin || adminUnlocked)) return
    consecutiveProfileTaps.current += 1
    const taps = consecutiveProfileTaps.current
    if (!unlocked && shouldUnlockExperimentalFeatures(taps)) {
      setUnlocked(true)
      writeFlag(experimentalFeaturesKey(userId), true)
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')
      if (!isAdmin) consecutiveProfileTaps.current = 0
    }
    if (!adminUnlocked && shouldUnlockAdminFeatures(taps, isAdmin)) {
      consecutiveProfileTaps.current = 0
      setAdminUnlocked(true)
      writeFlag(adminFeaturesKey(userId), true)
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')
    }
  }, [adminUnlocked, isAdmin, unlocked, userId])

  const resetProfileTaps = useCallback(() => {
    consecutiveProfileTaps.current = 0
  }, [])

  const setWelcomeReplayEnabled = useCallback(
    (enabled: boolean) => {
      setWelcomeReplayEnabledState(enabled)
      writeFlag(welcomeReplayKey(userId), enabled)
    },
    [userId],
  )

  const setAdminModeEnabled = useCallback(
    (enabled: boolean) => {
      if (!isAdmin || !adminUnlocked) return
      setAdminModeEnabledState(enabled)
      writeFlag(adminModeKey(userId), enabled)
    },
    [adminUnlocked, isAdmin, userId],
  )

  return {
    unlocked,
    welcomeReplayEnabled,
    setWelcomeReplayEnabled,
    adminUnlocked,
    adminModeEnabled,
    setAdminModeEnabled,
    registerProfileTap,
    resetProfileTaps,
  }
}
