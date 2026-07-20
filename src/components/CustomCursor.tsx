import { useEffect, useRef } from 'react'

/**
 * Lightweight custom cursor for laptop/desktop (pointer: fine) only — never
 * mounts its listeners on touch devices. Ports the "Curzr" ArrowPointer
 * behavior (a directional arrow that tilts to face its travel direction,
 * smoothed via an accumulated angle so it never snaps across the 359->0
 * wrap), redrawn as a themed inline SVG since the original relies on a
 * `.curzr-arrow-pointer` glyph the source snippet didn't actually include.
 * Colored via the existing --color-* tokens so it tracks light/dark
 * automatically. Every pointermove writes only `transform` (translate +
 * rotate combined into one string) — compositor-only, never triggers layout.
 */

// Classic solid arrow-cursor glyph (tip at the top-left), 24x24 viewBox.
const ARROW_PATH = 'M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z'
const DEGREES = 57.296 // 180 / PI

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

    let pointerX = 0
    let pointerY = 0
    let angle = 0
    let previousAngle = 0
    let angleDisplace = 0

    function handlePointerMove(event: PointerEvent) {
      const previousX = pointerX
      const previousY = pointerY
      pointerX = event.clientX
      pointerY = event.clientY
      const distanceX = previousX - pointerX
      const distanceY = previousY - pointerY
      const distance = Math.hypot(distanceX, distanceY)

      if (distance > 1) {
        const unsortedAngle =
          Math.atan(Math.abs(distanceY) / Math.abs(distanceX)) * DEGREES
        previousAngle = angle

        if (distanceX <= 0 && distanceY >= 0) angle = 90 - unsortedAngle
        else if (distanceX < 0 && distanceY < 0) angle = unsortedAngle + 90
        else if (distanceX >= 0 && distanceY <= 0) angle = 90 - unsortedAngle + 180
        else angle = unsortedAngle + 270

        if (Number.isNaN(angle)) {
          angle = previousAngle
        } else if (angle - previousAngle <= -270) {
          angleDisplace += 360 + angle - previousAngle
        } else if (angle - previousAngle >= 270) {
          angleDisplace += angle - previousAngle - 360
        } else {
          angleDisplace += angle - previousAngle
        }
      }

      cursor!.style.transform = `translate3d(${pointerX}px, ${pointerY}px, 0) rotate(${angleDisplace}deg)`
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
