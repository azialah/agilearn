import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react'
import { useReducedMotion } from 'motion/react'
import { cn } from '@/lib/cn'
import {
  distanceOutside,
  pillGeometry,
  recallGeometry,
  rememberGeometry,
  sameGeometry,
  segmentIndexAt,
  DRAG_CANCEL_SLOP_PX,
  DRAG_THRESHOLD_PX,
  type PillGeometry,
  type Span,
} from './segmented'

/** Pause between the finger lifting and the host acting, so the pill lands first. */
const COMMIT_SETTLE_MS = 140

export interface SegmentedControlProps {
  /** Committed selection — always the route, never the drag preview. */
  activeIndex: number
  count: number
  /** Fired only by a real drag; a tap falls through to whatever the segment is. */
  onCommit: (index: number) => void
  /**
   * Released on the segment that is already current. Distinct from onCommit so
   * a host can do something useful (scroll to top) instead of re-navigating to
   * the page you are already on.
   */
  onReselect?: (index: number) => void
  ariaLabel: string
  /**
   * Segments, given the index that should currently READ as selected: the
   * previewed one mid-drag, the committed one otherwise. Each rendered segment
   * must carry `data-segment-index`.
   */
  children: (readIndex: number) => ReactNode
  className?: string
  trackClassName?: string
  pillClassName?: string
  /** Rendered behind the segments; omit for controls with no moving pill. */
  renderPill?: boolean
  /** Lets a host freeze layout while a commit is in flight under the finger. */
  onDragStateChange?: (dragging: boolean) => void
  /**
   * The root element, for a host that needs to measure the whole control.
   * A callback ref rather than an object ref: the root is polymorphic, and a
   * callback widening its parameter to HTMLElement is assignable to every
   * concrete element's ref type without a cast.
   */
  rootRef?: (node: HTMLElement | null) => void
  /** Capture-phase press hook; runs before the gesture and does not consume it. */
  onPointerDownCapture?: (event: ReactPointerEvent<HTMLElement>) => void
  /**
   * Carries the pill's position across an unmount, for a strip that lives inside
   * a route component and therefore remounts on the very navigation it should
   * be animating. Omit for a control that stays mounted.
   */
  persistKey?: string
  as?: 'nav' | 'div'
}

/**
 * A track, a pill that slides between segments, and a press-and-slide gesture.
 *
 * Owns measurement and motion only. It never navigates: a tap is left to fall
 * through to the segment's own element, so an `<a href>` keeps its href, its
 * keyboard behaviour and its long-press menu. Only a genuine drag calls
 * `onCommit`.
 */
export function SegmentedControl({
  activeIndex,
  count,
  onCommit,
  onReselect,
  ariaLabel,
  children,
  className,
  trackClassName,
  pillClassName,
  renderPill = true,
  onDragStateChange,
  rootRef,
  onPointerDownCapture,
  persistKey,
  as = 'nav',
}: SegmentedControlProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()
  const remembered = useRef(recallGeometry(persistKey)).current
  const [geometry, setGeometry] = useState<PillGeometry | null>(remembered)
  const [preview, setPreview] = useState<number | null>(null)
  /**
   * Where the pill should rest between release and the route catching up.
   * Without it, clearing `preview` on release snaps the pill back to the tab you
   * came FROM for the length of the settle delay, then jerks forward when
   * navigation lands — a visible bounce on every commit.
   */
  const [pending, setPending] = useState<number | null>(null)
  const commitTimer = useRef(0)
  // Armed a frame after the first measurement: with no layout on the server the
  // first honest position only exists after a client layout pass, and animating
  // to it would play a slide on every page load. A remembered position is
  // already honest, so a remount starts armed and slides from where it left off.
  const [animate, setAnimate] = useState(!!remembered)
  const firstMeasure = useRef(true)

  const geometryRef = useRef<PillGeometry | null>(null)
  // Read inside the ResizeObserver so it does not tear down and re-subscribe
  // every time the selection changes.
  const activeIndexRef = useRef(activeIndex)
  const drag = useRef<{
    pointerId: number
    startX: number
    startY: number
    moved: boolean
    segments: Span[]
    box: { left: number; right: number; top: number; bottom: number }
  } | null>(null)
  const suppressClick = useRef(false)
  const clickTimer = useRef(0)

  // Refs that mirror state are synced in an effect, never during render: React
  // 19 flags render-phase ref writes, they run twice under StrictMode, and they
  // are discarded when a concurrent render is abandoned. Deferring is safe here
  // because every reader is an async observer or pointer callback.
  useEffect(() => {
    activeIndexRef.current = activeIndex
  }, [activeIndex])

  // Takes the index rather than reading the ref: the layout effect below runs
  // BEFORE the passive effect that syncs activeIndexRef, so reading the ref here
  // measured the previously selected tab and the pill never moved on navigation.
  // Only the ResizeObserver — which is async and always sees a settled ref —
  // goes through activeIndexRef.
  const measure = useCallback(
    (index: number, persist = true) => {
      const track = trackRef.current
      if (!track) return
      const segment = track.querySelector<HTMLElement>(`[data-segment-index="${index}"]`)
      if (!segment) return
      const trackBox = track.getBoundingClientRect()
      const segmentBox = segment.getBoundingClientRect()
      const next = pillGeometry(
        { left: trackBox.left, width: trackBox.width },
        { left: segmentBox.left, width: segmentBox.width },
      )
      // Skip the state update when nothing actually moved, or a resize storm
      // re-enters the scheduler on every frame.
      if (sameGeometry(geometryRef.current, next)) return
      geometryRef.current = next
      if (persistKey && persist) rememberGeometry(persistKey, next)
      setGeometry(next)
    },
    [persistKey],
  )

  const readIndex = preview ?? pending ?? activeIndex

  useLayoutEffect(() => {
    // A layout effect runs before paint, so measuring immediately would replace
    // the remembered position before the browser ever drew it — leaving nothing
    // to transition from. One frame later, the old position has been painted and
    // the move animates. The flag is cleared inside the frame, not before it:
    // StrictMode's mount → cleanup → mount cancels the first frame, and clearing
    // early made the remounted instance take the synchronous path, so the slide
    // never played in development.
    if (firstMeasure.current && remembered) {
      const frame = requestAnimationFrame(() => {
        firstMeasure.current = false
        measure(readIndex, preview === null)
      })
      return () => cancelAnimationFrame(frame)
    }
    firstMeasure.current = false
    measure(readIndex, preview === null)
  }, [measure, readIndex, preview, count, remembered])

  useEffect(() => {
    if (!geometry || animate) return
    const frame = requestAnimationFrame(() => setAnimate(true))
    return () => cancelAnimationFrame(frame)
  }, [geometry, animate])

  // Observe the track AND each segment: a language change alters label widths
  // without altering the track's, so watching the track alone misses it.
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const observer = new ResizeObserver(() => {
      // The layout effect owns the first measurement; letting the observer's
      // initial observation in would race the deferred frame and land the pill
      // at its destination with nothing to animate from.
      if (firstMeasure.current) return
      measure(activeIndexRef.current)
    })
    observer.observe(track)
    track
      .querySelectorAll<HTMLElement>('[data-segment-index]')
      .forEach((segment) => observer.observe(segment))
    return () => observer.disconnect()
  }, [measure, count])

  function handlePointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (event.pointerType === 'mouse') return
    // Ignore a second finger. Overwriting the drag state here leaves `moved`
    // stuck true for the rest of the session once the first finger lifts.
    if (drag.current) return
    const track = trackRef.current
    if (!track) return
    const box = track.getBoundingClientRect()
    // Rectangles are cached once, here. Hit-testing the live DOM on every
    // pointermove means a layout read per segment per move, and this handler
    // also writes — so each write invalidates layout for the next read, which
    // is exactly the thrash this control exists to avoid.
    const segments = Array.from(
      track.querySelectorAll<HTMLElement>('[data-segment-index]'),
    ).map((element) => {
      const rect = element.getBoundingClientRect()
      return { left: rect.left, width: rect.width }
    })
    // Capture BEFORE recording the drag, and only record it if capture took.
    //
    // Capture is what guarantees pointerup comes back to this element even when
    // the finger leaves the bar — and the bar is a thin strip, so leaving it is
    // routine. Without that guarantee a gesture can end somewhere we never hear
    // about, leaving `drag.current` set forever: every later pointerdown then
    // bails on the second-finger guard and the control is dead for the session.
    // So a pointer we cannot capture simply does not start a drag; taps still
    // fall through to the link, which is the interaction that matters most.
    //
    // Capture retargets pointer events only. The compatibility click still
    // dispatches at the real hit-test target, so tap-through is unaffected.
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      return
    }
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      segments,
      box: { left: box.left, right: box.right, top: box.top, bottom: box.bottom },
    }
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLElement>) {
    const current = drag.current
    if (!current || current.pointerId !== event.pointerId) return
    if (!current.moved) {
      const travel = Math.hypot(
        event.clientX - current.startX,
        event.clientY - current.startY,
      )
      // Under the threshold this is still a tap, and a tap must reach the link.
      if (travel < DRAG_THRESHOLD_PX) return
      current.moved = true
      onDragStateChange?.(true)
      // Re-cache here, not only at pointerdown. A press on a collapsed dock
      // expands it, and the dock now contracts horizontally too — so the rects
      // taken at pointerdown can describe the narrow layout while the bar is
      // already animating wide. By the time the threshold is crossed at least a
      // frame has passed and the expanded state is committed, so these are the
      // rects the rest of the gesture should hit-test against.
      const track = trackRef.current
      if (track) {
        current.segments = Array.from(
          track.querySelectorAll<HTMLElement>('[data-segment-index]'),
        ).map((element) => {
          const rect = element.getBoundingClientRect()
          return { left: rect.left, width: rect.width }
        })
        const box = track.getBoundingClientRect()
        current.box = {
          left: box.left,
          right: box.right,
          top: box.top,
          bottom: box.bottom,
        }
      }
    }
    setPreview(segmentIndexAt(current.segments, event.clientX))
  }

  const cancelPendingCommit = useCallback(() => {
    window.clearTimeout(commitTimer.current)
    setPending(null)
  }, [])

  function handlePointerUp(event: ReactPointerEvent<HTMLElement>) {
    const current = drag.current
    if (!current || current.pointerId !== event.pointerId) return
    drag.current = null
    setPreview(null)
    if (!current.moved) return
    onDragStateChange?.(false)

    const cancelled =
      distanceOutside(current.box, event.clientX, event.clientY) > DRAG_CANCEL_SLOP_PX
    const index = cancelled ? null : segmentIndexAt(current.segments, event.clientX)

    // The browser's synthetic click lands after this and would otherwise
    // override the release target with wherever the finger started.
    suppressClick.current = true
    window.clearTimeout(clickTimer.current)
    clickTimer.current = window.setTimeout(() => {
      suppressClick.current = false
    }, 0)

    // Any release supersedes a commit still settling from the previous one.
    // Cancelling before the branches below matters: both of them return early,
    // and leaving the old timer armed let a cancelled or re-selected gesture
    // still navigate 140ms later.
    cancelPendingCommit()

    if (index === null) return
    if (index === activeIndex) {
      onReselect?.(index)
      return
    }
    // Let the pill visibly land before the screen changes under it. The dock is
    // what confirms the choice, so it finishes speaking first; 140ms is long
    // enough to read as deliberate and short enough not to feel unresponsive.
    setPending(index)
    commitTimer.current = window.setTimeout(() => onCommit(index), COMMIT_SETTLE_MS)
  }

  useEffect(() => {
    if (pending === null) return
    // The route arrived where the pill already is: hand control back to it.
    if (pending === activeIndex) {
      setPending(null)
      return
    }
    // The route went somewhere else entirely — a tap, a link, the back button.
    // That supersedes this commit; letting it fire would drag the user back.
    if (activeIndexRef.current !== activeIndex) {
      cancelPendingCommit()
      return
    }
    // Otherwise a commit that never changes the route (the overflow sheet)
    // still has to release the pill.
    const timer = window.setTimeout(() => setPending(null), COMMIT_SETTLE_MS + 460)
    return () => window.clearTimeout(timer)
  }, [pending, activeIndex, cancelPendingCommit])

  // NIT: the only timer here without a cleanup, which reads as an oversight.
  useEffect(
    () => () => {
      window.clearTimeout(commitTimer.current)
      window.clearTimeout(clickTimer.current)
    },
    [],
  )

  function handlePointerCancel(event: ReactPointerEvent<HTMLElement>) {
    if (drag.current?.pointerId !== event.pointerId) return
    const wasDragging = drag.current.moved
    drag.current = null
    setPreview(null)
    if (wasDragging) onDragStateChange?.(false)
    cancelPendingCommit()
  }

  function handleClickCapture(event: ReactMouseEvent<HTMLElement>) {
    if (!suppressClick.current) return
    event.preventDefault()
    event.stopPropagation()
    suppressClick.current = false
  }

  const Root = as

  return (
    <Root
      ref={rootRef}
      aria-label={ariaLabel}
      className={className}
      onPointerDownCapture={onPointerDownCapture}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onClickCapture={handleClickCapture}
    >
      <div ref={trackRef} className={cn('relative', trackClassName)}>
        {renderPill && geometry && (
          <span
            aria-hidden
            data-dragging={preview === null ? undefined : 'true'}
            className={cn(
              'pointer-events-none absolute',
              // Reduced motion drops the transition, not the pill: the pill IS
              // the selection, it just arrives instantly.
              animate && !reduceMotion && 'segmented-pill-animated',
              pillClassName,
            )}
            style={{
              left: `${geometry.leftPercent}%`,
              width: `${geometry.widthPercent}%`,
            }}
          />
        )}
        {children(readIndex)}
      </div>
    </Root>
  )
}
