import { useEffect, useRef } from 'react'

interface ProgressBarProps {
  /** Total slide duration in milliseconds. */
  durationMs: number
  paused: boolean
  /** Changing this key restarts the timer (i.e. the current slide index). */
  slideKey: number
  onComplete: () => void
}

/**
 * Auto-advance progress bar. Drives its own `requestAnimationFrame` loop and
 * writes width straight to the DOM node, so the 60fps animation never
 * re-renders the player above it. Pausing freezes elapsed time; resuming
 * continues from where it left off. Restarts whenever `slideKey` changes.
 */
export function ProgressBar({
  durationMs,
  paused,
  slideKey,
  onComplete,
}: ProgressBarProps) {
  const fillRef = useRef<HTMLDivElement>(null)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  // Elapsed milliseconds accumulated for the current slide; survives pauses.
  const elapsedRef = useRef(0)

  // Reset accumulated time whenever the slide changes.
  useEffect(() => {
    elapsedRef.current = 0
    if (fillRef.current) fillRef.current.style.width = '0%'
  }, [slideKey])

  useEffect(() => {
    if (paused) return
    let frame = 0
    let last = performance.now()

    const tick = (now: number) => {
      const delta = now - last
      last = now
      elapsedRef.current += delta
      const pct = Math.min((elapsedRef.current / durationMs) * 100, 100)
      if (fillRef.current) fillRef.current.style.width = `${pct}%`
      if (elapsedRef.current >= durationMs) {
        onCompleteRef.current()
        return
      }
      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [paused, durationMs, slideKey])

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 h-1.5 bg-white/10"
      role="progressbar"
      aria-label="Time until next slide"
    >
      <div
        ref={fillRef}
        className="h-full w-0 bg-(--ss-accent) transition-[width] duration-75 ease-linear"
      />
    </div>
  )
}
