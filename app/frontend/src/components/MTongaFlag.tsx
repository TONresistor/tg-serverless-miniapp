import { lazy, Suspense, useEffect, useState } from 'react'

const Lottie = lazy(() =>
  import('./Lottie').then((module) => ({ default: module.Lottie })),
)
const mtongaAnimation = () => import('../assets/lotties/mtonga.json')

export function MTongaFlag({
  className = 'mtonga__flag',
}: {
  className?: string
}) {
  const [animation, setAnimation] = useState<object | null>(null)

  useEffect(() => {
    let active = true
    void mtongaAnimation().then((module) => {
      if (active) setAnimation(module.default)
    })
    return () => {
      active = false
    }
  }, [])

  return (
    <div className={className} aria-hidden="true">
      {animation && (
        <Suspense fallback={null}>
          <Lottie data={animation} />
        </Suspense>
      )}
    </div>
  )
}
