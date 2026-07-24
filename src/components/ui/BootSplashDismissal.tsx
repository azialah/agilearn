import { useEffect } from 'react'

/** Removes the HTML boot splash once React has committed its first app frame. */
export function BootSplashDismissal() {
  useEffect(() => {
    const splash = document.getElementById('app-boot-splash')
    if (!splash) return

    const frame = window.requestAnimationFrame(() => {
      splash.dataset.ready = 'true'
      const remove = () => splash.remove()
      splash.addEventListener('transitionend', remove, { once: true })
      window.setTimeout(remove, 400)
    })

    return () => window.cancelAnimationFrame(frame)
  }, [])

  return null
}
