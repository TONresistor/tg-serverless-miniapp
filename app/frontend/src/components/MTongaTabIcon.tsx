import type { AnimationItem } from 'lottie-web'
import { useEffect, useRef } from 'react'

export default function MTongaTabIcon({ active }: { active?: boolean }) {
  const container = useRef<HTMLDivElement>(null)
  const animation = useRef<AnimationItem | null>(null)
  const reducedMotion = useRef(false)
  const activeRef = useRef(active)
  activeRef.current = active

  useEffect(() => {
    if (!container.current) return
    let cancelled = false
    reducedMotion.current =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
    void Promise.all([
      import('lottie-web/build/player/lottie_light'),
      import('../assets/lotties/ton-dns.json'),
    ]).then(([{ default: lottie }, { default: animationData }]) => {
      if (cancelled || !container.current) return
      const instance = lottie.loadAnimation({
        container: container.current,
        renderer: 'svg',
        loop: false,
        autoplay: false,
        animationData,
      })
      animation.current = instance
      instance.addEventListener('DOMLoaded', () => {
        if (activeRef.current && !reducedMotion.current)
          instance.goToAndPlay(0, true)
        else instance.goToAndStop(0, true)
      })
    })
    return () => {
      cancelled = true
      animation.current?.destroy()
      animation.current = null
    }
  }, [])

  useEffect(() => {
    const instance = animation.current
    if (!instance) return
    if (active && !reducedMotion.current) instance.goToAndPlay(0, true)
    else instance.goToAndStop(0, true)
  }, [active])

  return (
    <div ref={container} className="mtonga-nav-lottie" aria-hidden="true" />
  )
}
