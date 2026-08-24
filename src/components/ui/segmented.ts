/**
 * Pure geometry for SegmentedControl — no React, no DOM types beyond plain
 * numbers, so the drag maths is testable without a layout engine.
 *
 * See segmented.test.ts.
 */

export interface Span {
  left: number
  width: number
}

export interface PillGeometry {
  /** Offset from the track's left edge, as a percentage of track width. */
  leftPercent: number
  /** Percentage of track width. */
  widthPercent: number
}

/**
 * The pill's box expressed as percentages of the track.
 *
 * Percentages rather than pixels on purpose: the browser then interpolates the
 * pill in lockstep with any proportional resize — rotate the phone, open the
 * keyboard, change the sidebar — with no JavaScript and no re-render involved.
 * In pixels every width change has to be chased in JS, so the pill lands a
 * frame late, and because it carries its own transition it eases toward a
 * target that is itself still moving.
 */
export function pillGeometry(track: Span, segment: Span): PillGeometry {
  if (track.width <= 0) return { leftPercent: 0, widthPercent: 0 }
  return {
    leftPercent: ((segment.left - track.left) / track.width) * 100,
    widthPercent: (segment.width / track.width) * 100,
  }
}

/** Rounded to a hundredth so sub-pixel jitter does not count as a change. */
export function sameGeometry(a: PillGeometry | null, b: PillGeometry): boolean {
  if (!a) return false
  const round = (value: number) => Math.round(value * 100)
  return (
    round(a.leftPercent) === round(b.leftPercent) &&
    round(a.widthPercent) === round(b.widthPercent)
  )
}

/**
 * Which segment a finger at `x` is over.
 *
 * Nearest-centre rather than strict containment: the gaps between tabs are
 * real, and a drag that pauses in one must still preview a destination rather
 * than blanking the pill. Out-of-range x clamps to the end segment for the same
 * reason — sliding past the last tab should hold it, not lose it.
 */
export function segmentIndexAt(segments: readonly Span[], x: number): number | null {
  if (segments.length === 0) return null
  let best = 0
  let bestDistance = Infinity
  segments.forEach((segment, index) => {
    const distance = Math.abs(segment.left + segment.width / 2 - x)
    if (distance < bestDistance) {
      bestDistance = distance
      best = index
    }
  })
  return best
}

export interface Box {
  left: number
  right: number
  top: number
  bottom: number
}

/** Distance from a point to a box; 0 when the point is inside it. */
export function distanceOutside(box: Box, x: number, y: number): number {
  const dx = Math.max(box.left - x, 0, x - box.right)
  const dy = Math.max(box.top - y, 0, y - box.bottom)
  return Math.hypot(dx, dy)
}

/** Below this much travel the gesture is a tap, and must fall through to the link. */
export const DRAG_THRESHOLD_PX = 12

/** Released further than this outside the bar cancels rather than commits. */
export const DRAG_CANCEL_SLOP_PX = 44

/**
 * Last known pill geometry, per control.
 *
 * Tab strips that live inside route components unmount and remount on
 * navigation — which is the interaction the pill exists to smooth. Without a
 * remembered starting point the new instance simply appears at the destination,
 * and the slide never happens on the one gesture that matters. Keyed by the
 * caller so two strips cannot inherit each other's position.
 */
const lastGeometry = new Map<string, PillGeometry>()

export function rememberGeometry(key: string, geometry: PillGeometry): void {
  lastGeometry.set(key, geometry)
}

export function recallGeometry(key: string | undefined): PillGeometry | null {
  return key ? (lastGeometry.get(key) ?? null) : null
}
