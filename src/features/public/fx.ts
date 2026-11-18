import { useEffect, useRef, type PointerEvent } from 'react'
import { useReducedMotion } from 'motion/react'

/**
 * Pointer effects for the marketing pages. They write CSS custom properties /
 * transforms straight onto the element so a pointer move never re-renders React.
 */

function finePointer(e: PointerEvent) {
  return e.pointerType === 'mouse' || e.pointerType === 'pen'
}

/** Magnetic button: leans toward the pointer, springs back (CSS transition) on leave. */
export function useMagnetic() {
  const reduce = useReducedMotion()
  if (reduce) return {}
  return {
    onPointerMove(e: PointerEvent<HTMLElement>) {
      if (!finePointer(e)) return
      const el = e.currentTarget
      const r = el.getBoundingClientRect()
      const x = (e.clientX - r.left - r.width / 2) * 0.22
      const y = (e.clientY - r.top - r.height / 2) * 0.32
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`
    },
    onPointerLeave(e: PointerEvent<HTMLElement>) {
      e.currentTarget.style.transform = ''
    },
  }
}

/** Spotlight + tilt card: --mx/--my drive the glow, --rx/--ry the tilt. */
export function useSpotlight() {
  const reduce = useReducedMotion()
  return {
    onPointerMove(e: PointerEvent<HTMLElement>) {
      const el = e.currentTarget
      const r = el.getBoundingClientRect()
      const x = e.clientX - r.left
      const y = e.clientY - r.top
      el.style.setProperty('--mx', `${x}px`)
      el.style.setProperty('--my', `${y}px`)
      if (reduce || !finePointer(e)) return
      el.style.setProperty('--rx', `${((y / r.height - 0.5) * -6).toFixed(2)}deg`)
      el.style.setProperty('--ry', `${((x / r.width - 0.5) * 8).toFixed(2)}deg`)
    },
    onPointerLeave(e: PointerEvent<HTMLElement>) {
      e.currentTarget.style.removeProperty('--rx')
      e.currentTarget.style.removeProperty('--ry')
    },
  }
}

/** Runs `onFrame` at most once per animation frame while the window scrolls (and once on mount). */
export function useScrollFrame(onFrame: () => void) {
  const cb = useRef(onFrame)
  useEffect(() => {
    cb.current = onFrame
  })
  useEffect(() => {
    let raf = 0
    const schedule = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        cb.current()
      })
    }
    schedule()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [])
}

/** Scroll to an element id below the sticky header. */
export function scrollToId(id: string, reduce: boolean, offset = 70) {
  const el = document.getElementById(id)
  if (!el) return
  const top = el.getBoundingClientRect().top + window.scrollY - offset
  window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' })
}
