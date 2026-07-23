import { useEffect, useRef } from 'react'

/**
 * Lightweight custom cursor for laptop/desktop (pointer: fine) only — never
 * mounts its listeners on touch devices. The arrow keeps a real mouse
 * cursor's fixed orientation (tip at the top-left); it does not rotate to
 * face its travel direction. Colored via the existing --color-* tokens so it
 * tracks light/dark automatically. Every pointermove writes only `transform`
 * (a translate) — compositor-only, never triggers layout.
 */

// Classic solid arrow-cursor glyph (tip at the top-left), 24x24 viewBox.
const ARROW_PATH = 'M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z'

export function CustomCursor() {
  const ref = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (coarsePointer || reduceMotion) return

    const cursor = ref.current
    if (!cursor) return

    const html = document.documentElement
    html.classList.add('custom-cursor-active')

    function handlePointerMove(event: PointerEvent) {
      // Fixed angle: only follow the pointer position, never rotate.
      cursor!.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`
    }

    function handleLeaveWindow() {
      cursor!.style.opacity = '0'
    }
    function handleEnterWindow() {
      cursor!.style.opacity = '1'
    }
    // A touchscreen laptop can still report pointer:fine for its trackpad;
    // if an actual touch happens, bail out for the rest of the session.
    function handleTouchStart() {
      html.classList.remove('custom-cursor-active')
      teardown()
    }

    function teardown() {
      window.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('mouseleave', handleLeaveWindow)
      document.removeEventListener('mouseenter', handleEnterWindow)
      window.removeEventListener('touchstart', handleTouchStart)
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    document.addEventListener('mouseleave', handleLeaveWindow)
    document.addEventListener('mouseenter', handleEnterWindow)
    window.addEventListener('touchstart', handleTouchStart, { passive: true, once: true })

    return () => {
      html.classList.remove('custom-cursor-active')
      teardown()
    }
  }, [])

  return (
    <svg
      ref={ref}
      className="app-cursor"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      aria-hidden="true"
    >
      <path d={ARROW_PATH} />
    </svg>
  )
}
