import { useEffect, useRef } from 'react'
// @ts-expect-error lottie_light has no bundled types.
import lottie from 'lottie-web/build/player/lottie_canvas'

type AnimationItem = { destroy: () => void }

type Props = {
  data: object
}

export function Lottie({ data }: Props) {
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!container.current) return
    const anim: AnimationItem = lottie.loadAnimation({
      container: container.current,
      renderer: 'canvas',
      loop: true,
      autoplay: true,
      animationData: data,
      rendererSettings: { preserveAspectRatio: 'xMidYMid meet' },
    })
    return () => anim.destroy()
  }, [data])

  return <div ref={container} className="lottie" />
}
