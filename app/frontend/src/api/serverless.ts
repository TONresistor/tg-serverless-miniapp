export type ServerlessError = {
  message: string
  type: string
  parameters?: Record<string, unknown>
}
const CALL_TIMEOUT_MS = 15_000

// The official Telegram SDK supplies signed initData. Business input never carries identity.
export function call<T>(
  name: string,
  input: Record<string, unknown> = {},
  signal?: AbortSignal,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const serverless =
      typeof window === 'undefined'
        ? undefined
        : window.Telegram?.WebApp.Serverless
    if (!serverless) {
      reject(
        new Error(
          'Telegram Serverless is unavailable. Update Telegram and reopen the app.',
        ),
      )
      return
    }
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    let settled = false
    const finish = (error: Error | null, result?: T) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      signal?.removeEventListener('abort', abort)
      if (error) reject(error)
      else resolve(result as T)
    }
    const abort = () => finish(new DOMException('Aborted', 'AbortError'))
    const timeout = setTimeout(
      () =>
        finish(
          new Error('Telegram Serverless request timed out. Please try again.'),
        ),
      CALL_TIMEOUT_MS,
    )
    signal?.addEventListener('abort', abort, { once: true })
    try {
      serverless.call<T>(name, input, (error, result) => {
        finish(error ? new Error(error.message) : null, result)
      })
    } catch (error) {
      finish(error instanceof Error ? error : new Error(String(error)))
    }
  })
}
