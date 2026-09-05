export const GUIDE_TOUR_TARGETS = [
  'tabs',
  'search',
  'contribute',
  'card',
] as const

export type GuideTourTarget = (typeof GUIDE_TOUR_TARGETS)[number]

export function nextAvailableGuideStep(
  current: number,
  available: readonly boolean[],
): number | null {
  for (let index = current + 1; index < available.length; index += 1) {
    if (available[index]) return index
  }
  return null
}

export function previousAvailableGuideStep(
  current: number,
  available: readonly boolean[],
): number | null {
  for (let index = current - 1; index >= 0; index -= 1) {
    if (available[index]) return index
  }
  return null
}
