import { lazy, Suspense } from 'react'

const Spline = lazy(() => import('@splinetool/react-spline'))

const SCENE = 'https://prod.spline.design/qTHhQsnhCAJ7KYga/scene.splinecode'

export function SplineHero() {
  return (
    <div
      className="pointer-events-auto fixed inset-0 z-0 h-[100dvh] w-full overflow-hidden"
      style={{ minHeight: '100vh' }}
      aria-hidden="true"
    >
      <Suspense fallback={<div className="h-full w-full bg-surface" />}>
        <Spline
          scene={SCENE}
          renderOnDemand={false}
          style={{ width: '100%', height: '100%', minHeight: '100vh' }}
        />
      </Suspense>
    </div>
  )
}
