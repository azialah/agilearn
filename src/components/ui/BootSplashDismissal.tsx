import { useEffect } from 'react'
import { useRouterState } from '@tanstack/react-router'

/** Hard cap so a stalled route can never strand the user on the splash. */
const FAILSAFE_MS = 8000

function dismiss() {
  const splash = document.getElementById('app-boot-splash')
  if (!splash || splash.dataset.ready === 'true') return
  splash.dataset.ready = 'true'
  const remove = () => splash.remove()
  // The splash's own opacity fade is the last step of the iris reveal (see
  // index.html); children's transitions bubble here too, so filter for it.
  splash.addEventListener('transitionend', (e) => {
    if (e.target === splash && e.propertyName === 'opacity') remove()
  })
  window.setTimeout(remove, 1100)
}

/**
 * Removes the HTML boot splash once the first route has actually resolved —
 * not merely when the root commits. Dismissing on root commit handed off to
 * the route skeleton while the lazy route chunk was still in flight, so cold boot
 * showed two different loading screens back to back.
 */
export function BootSplashDismissal() {
  const isReady = useRouterState({ select: (s) => s.status === 'idle' })

  useEffect(() => {
    if (!isReady) return
    const frame = window.requestAnimationFrame(dismiss)
    return () => window.cancelAnimationFrame(frame)
  }, [isReady])

  useEffect(() => {
    const timer = window.setTimeout(dismiss, FAILSAFE_MS)
    return () => window.clearTimeout(timer)
  }, [])

  return null
}
