import { useLayoutEffect, useRef, type RefObject } from 'react'

export function textareaHeight(scrollHeight: number): number {
  return Math.max(52, Math.min(scrollHeight, 118))
}

export function isNearBottom(
  scrollHeight: number,
  clientHeight: number,
  scrollTop: number,
): boolean {
  return scrollHeight - clientHeight - scrollTop <= 24
}

export function useAutosizeTextarea(
  ref: RefObject<HTMLTextAreaElement | null>,
  value: string,
  fieldKey: unknown,
) {
  useLayoutEffect(() => {
    const textarea = ref.current
    if (!textarea) return
    textarea.style.height = 'auto'
    const height = textarea.scrollHeight
    textarea.style.height = `${textareaHeight(height)}px`
    textarea.style.overflowY = height > 118 ? 'auto' : 'hidden'
  }, [ref, value, fieldKey])
}

// Follow resizing only while the reader remains near the bottom.
export function useConversationScroll(
  ref: RefObject<HTMLDivElement | null>,
  request: number,
) {
  const pinned = useRef(false)

  useLayoutEffect(() => {
    const viewport = ref.current
    if (!viewport) return
    const track = () => {
      pinned.current = isNearBottom(
        viewport.scrollHeight,
        viewport.clientHeight,
        viewport.scrollTop,
      )
    }
    const observer = new ResizeObserver(() => {
      if (pinned.current) viewport.scrollTop = viewport.scrollHeight
    })
    viewport.addEventListener('scroll', track, { passive: true })
    observer.observe(viewport)
    return () => {
      observer.disconnect()
      viewport.removeEventListener('scroll', track)
    }
  }, [ref])

  useLayoutEffect(() => {
    if (request === 0) return
    const frame = window.requestAnimationFrame(() => {
      const viewport = ref.current
      if (!viewport) return
      viewport.scrollTop = viewport.scrollHeight
      pinned.current = true
    })
    return () => window.cancelAnimationFrame(frame)
  }, [ref, request])
}
