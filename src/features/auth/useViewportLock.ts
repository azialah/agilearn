import { useEffect } from 'react'

/**
 * Keeps mobile/tablet auth flows inside their viewport. Long content scrolls
 * inside AuthShell's pane rather than moving the document itself.
 */
export function useViewportLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return

    const media = window.matchMedia('(max-width: 1023px)')
    let restore: (() => void) | undefined

    function updateLock() {
      restore?.()
      restore = undefined

      if (!media.matches) return

      const html = document.documentElement
      const body = document.body
      const previous = {
        htmlOverflow: html.style.overflow,
        bodyOverflow: body.style.overflow,
        bodyOverscrollBehavior: body.style.overscrollBehavior,
      }

      html.style.overflow = 'hidden'
      body.style.overflow = 'hidden'
      body.style.overscrollBehavior = 'none'

      restore = () => {
        html.style.overflow = previous.htmlOverflow
        body.style.overflow = previous.bodyOverflow
        body.style.overscrollBehavior = previous.bodyOverscrollBehavior
      }
    }

    updateLock()
    media.addEventListener('change', updateLock)
    return () => {
      media.removeEventListener('change', updateLock)
      restore?.()
    }
  }, [enabled])
}
