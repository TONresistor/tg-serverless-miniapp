const FALLBACK_PREFIX = '_tg_cs_fallback:'
const CLOUD_TIMEOUT_MS = 3_000

function readFallback(key: string): string | null {
  try {
    return localStorage.getItem(FALLBACK_PREFIX + key)
  } catch {
    return null
  }
}

function writeFallback(key: string, value: string): boolean {
  try {
    localStorage.setItem(FALLBACK_PREFIX + key, value)
    return true
  } catch {
    return false
  }
}

export async function getCloudItem(key: string): Promise<string | null> {
  const cs = window.Telegram?.WebApp?.CloudStorage
  if (!cs) return readFallback(key)
  return new Promise((resolve) => {
    let settled = false
    const finish = (value: string | null) => {
      if (settled) return
      settled = true
      window.clearTimeout(timeout)
      resolve(value)
    }
    const timeout = window.setTimeout(
      () => finish(readFallback(key)),
      CLOUD_TIMEOUT_MS,
    )
    try {
      cs.getItem(key, (err, value) => {
        if (settled) return
        if (err) finish(readFallback(key))
        else {
          writeFallback(key, value ?? '')
          finish(value || null)
        }
      })
    } catch {
      finish(readFallback(key))
    }
  })
}

export async function setCloudItem(
  key: string,
  value: string,
): Promise<boolean> {
  const cached = writeFallback(key, value)
  const cs = window.Telegram?.WebApp?.CloudStorage
  if (!cs) return cached
  return new Promise((resolve) => {
    let settled = false
    const finish = (ok: boolean) => {
      if (settled) return
      settled = true
      window.clearTimeout(timeout)
      resolve(ok)
    }
    const timeout = window.setTimeout(() => finish(false), CLOUD_TIMEOUT_MS)
    try {
      cs.setItem(key, value, (err, ok) => finish(!err && !!ok))
    } catch {
      finish(false)
    }
  })
}
