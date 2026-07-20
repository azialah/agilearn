import { useCallback, useEffect, useState } from 'react'

/** Track the user's `prefers-reduced-motion` setting, reacting to changes. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return reduced
}

interface FullscreenApi {
  isFullscreen: boolean
  supported: boolean
  toggle: () => void
}

/**
 * Wrap the Fullscreen API for a specific element ref. Falls back to a no-op
 * (with `supported: false`) on browsers or contexts that block it.
 */
export function useFullscreen(
  target: React.RefObject<HTMLElement | null>,
): FullscreenApi {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const supported =
    typeof document !== 'undefined' && !!document.documentElement.requestFullscreen

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggle = useCallback(() => {
    if (!supported) return
    const node = target.current
    if (!document.fullscreenElement) {
      node?.requestFullscreen?.().catch(() => {
        /* user gesture / permission denied — ignore */
      })
    } else {
      document.exitFullscreen?.().catch(() => {})
    }
  }, [supported, target])

  return { isFullscreen, supported, toggle }
}
