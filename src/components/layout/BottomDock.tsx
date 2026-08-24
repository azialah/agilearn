import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { Avatar } from '@/components/ui/Avatar'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { useLocale } from '@/lib/locale'
import { cn } from '@/lib/cn'
import { activeDockIndex, type DockItem } from './dockItems'

export interface BottomDockProps {
  items: DockItem[]
  /** Each audience names itself differently to a screen reader. */
  ariaLabel: string
  /**
   * This ROUTE hides the dock. Passed in rather than inferred, because "no dock
   * on this route" and "no dock at this breakpoint" look identical from the
   * outside and mean opposite things to the height variable (see publishHeight).
   */
  suppressed?: boolean
  /** Run when a route-less item (the overflow tab) is chosen. */
  onOverflow?: () => void
}

/** Downward travel before collapsing — below this a tap's own scroll-into-view wins. */
const COLLAPSE_AFTER_PX = 24
/** Stillness after which the dock returns of its own accord. */
const RESTORE_AFTER_MS = 1000

/**
 * The one bottom navigation bar, shared by every audience.
 *
 * Two hand-mirrored bars always drift: feature by feature, until one has
 * gesture selection and safe-area handling and the other is still a static
 * strip. Only `items` and `ariaLabel` are parameterised — everything else is
 * identical by construction, which is the point.
 */
export function BottomDock({
  items,
  ariaLabel,
  suppressed = false,
  onOverflow,
}: BottomDockProps) {
  const { t } = useLocale()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const capsuleRef = useRef<HTMLElement | null>(null)
  const setCapsule = useCallback((node: HTMLElement | null) => {
    capsuleRef.current = node
  }, [])
  const [collapsed, setCollapsed] = useState(false)
  const [dragging, setDragging] = useState(false)

  const activeIndex = activeDockIndex(items, pathname)

  // Every reader below is an async scroll or ResizeObserver callback, so these
  // refs are synced in an effect rather than during render — React 19 flags
  // render-phase ref writes, and they are discarded when a concurrent render is
  // abandoned.
  const collapsedRef = useRef(collapsed)
  const suppressedRef = useRef(suppressed)
  useEffect(() => {
    suppressedRef.current = suppressed
  }, [suppressed])

  // Written synchronously with the state rather than in a passive effect. The
  // ResizeObserver fires on the same frame as the commit that starts the label
  // transition, before any deferred effect drains — so a lagging ref meant
  // publishHeight could read `false` mid-collapse and publish a shrinking
  // height, which moves page content, which fires scroll, which is the collapse
  // trigger. (A ref write inside an event handler is legal; the React 19 rule
  // this file follows elsewhere is about render-phase writes.)
  const setCollapsedNow = useCallback((next: boolean) => {
    collapsedRef.current = next
    setCollapsed(next)
  }, [])

  /**
   * Publish the MEASURED height so page padding and any floating button reserve
   * the right space. Never hardcode it: the same bar is meaningfully taller on a
   * notched phone in standalone mode than in a desktop browser, so a fixed
   * offset misaligns exactly the devices a PWA targets.
   *
   * A measured zero is ambiguous, so there are three outcomes, not two.
   */
  const publishHeight = useCallback(() => {
    const element = capsuleRef.current
    const root = document.documentElement
    const height = element?.getBoundingClientRect().height ?? 0
    if (height > 0) {
      // Never publish the collapsed height. Republishing as the bar shrinks
      // moves page content, and moving content can itself fire a scroll event —
      // which is the collapse trigger. The bar shrinks; the space it reserves
      // deliberately does not.
      if (!collapsedRef.current) root.style.setProperty('--dock-height', `${height}px`)
      return
    }
    if (suppressedRef.current) {
      // Zero because THIS ROUTE hides it: publish a literal 0px so consumers'
      // arithmetic collapses with no per-route special-casing.
      root.style.setProperty('--dock-height', '0px')
    } else {
      // Zero because the BREAKPOINT hides it: remove the property so each
      // consumer's own fallback applies.
      root.style.removeProperty('--dock-height')
    }
  }, [])

  useEffect(() => {
    const element = capsuleRef.current
    if (!element) return
    const observer = new ResizeObserver(publishHeight)
    observer.observe(element)
    publishHeight()
    return () => observer.disconnect()
  }, [publishHeight])

  // Re-publish when the route's suppression changes: same measured zero,
  // opposite meaning.
  useEffect(() => {
    publishHeight()
  }, [publishHeight, suppressed])

  /**
   * One capture-phase listener on the document.
   *
   * Scroll events do not bubble but they do capture, so this sees every inner
   * scroller in the app without any of them opting in — which matters here,
   * because a gradebook or a user list owns its own scroller rather than
   * scrolling the page.
   */
  useEffect(() => {
    // Not attached at all where the dock is suppressed.
    if (suppressed) return

    // Per-scroller, not one shared counter: a single counter adds 15px in one
    // list to 15px in another and collapses when neither gesture asked for it.
    const lastOffset = new WeakMap<EventTarget, number>()
    const downTravel = new WeakMap<EventTarget, number>()
    let idle = 0
    // Seed the page scroller's baseline now. Without it the first scroll event
    // after mount computes a delta against itself, so it is always zero and the
    // gesture's opening movement is discarded — visible when a page is restored
    // part-scrolled and the user immediately flicks down. Inner scrollers cannot
    // be enumerated up front and keep the fallback below.
    lastOffset.set(document, window.scrollY)

    function handleScroll(event: Event) {
      const target = event.target
      if (!target) return
      const offset =
        target === document
          ? window.scrollY
          : ((target as HTMLElement).scrollTop ?? window.scrollY)
      const previous = lastOffset.get(target) ?? offset
      lastOffset.set(target, offset)
      const delta = offset - previous

      window.clearTimeout(idle)
      idle = window.setTimeout(() => {
        // Also restore after about a second of stillness.
        if (collapsedRef.current) setCollapsedNow(false)
      }, RESTORE_AFTER_MS)

      if (delta < 0) {
        downTravel.set(target, 0)
        // Restore immediately on any upward scroll. A threshold here makes the
        // bar feel stuck: upward is exactly the gesture that means "give it
        // back". Gated on the ref so this does not enter the scheduler on every
        // tick of every scroller.
        if (collapsedRef.current) setCollapsedNow(false)
        return
      }
      if (delta === 0) return

      const travelled = (downTravel.get(target) ?? 0) + delta
      downTravel.set(target, travelled)
      if (travelled > COLLAPSE_AFTER_PX && !collapsedRef.current) setCollapsedNow(true)
    }

    document.addEventListener('scroll', handleScroll, { capture: true, passive: true })
    return () => {
      window.clearTimeout(idle)
      document.removeEventListener('scroll', handleScroll, { capture: true })
    }
  }, [suppressed, setCollapsedNow])

  // The dock never unmounts, so a collapse earned by scrolling one page would
  // otherwise persist onto the next one, which opens at the top.
  useEffect(() => {
    setCollapsedNow(false)
  }, [pathname, setCollapsedNow])

  /**
   * Releasing on the tab you are already on sends the page back to the top,
   * the way iOS does. Re-navigating would discard nothing and show nothing, so
   * the gesture would otherwise be the one drag with no outcome at all.
   */
  function reselect() {
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
    })
  }

  function commit(index: number) {
    const item = items[index]
    if (!item) return
    if (item.to) navigate({ to: item.to })
    else onOverflow?.()
  }

  // A press anywhere on the dock expands it, in the capture phase, and does not
  // otherwise interfere — the press still reaches the link and still navigates,
  // so a collapsed bar never costs an extra tap.
  function handleExpandOnPress() {
    if (collapsedRef.current) setCollapsedNow(false)
  }

  // Tabs must not shift under a finger already committing, so a drag in flight
  // holds the bar open regardless of scroll.
  const showLabels = !collapsed || dragging

  return (
    <SegmentedControl
      as="nav"
      ariaLabel={ariaLabel}
      activeIndex={activeIndex}
      count={items.length}
      onCommit={commit}
      onReselect={reselect}
      onDragStateChange={setDragging}
      renderPill={activeIndex >= 0}
      rootRef={setCapsule}
      onPointerDownCapture={handleExpandOnPress}
      // Rule of the breakpoint: gated in CSS, never in JavaScript. A
      // media-query hook reports "no match" for both the server render and the
      // hydration render, so a JS-gated bar renders on every server pass and
      // vanishes on desktop right after hydration — a layout shift on every
      // desktop load for a bar desktop never wanted. `hidden` (not unmount)
      // when the route suppresses it, so the ResizeObserver survives and the
      // height variable keeps meaning "no dock HERE" rather than "no dock at
      // all".
      className={cn(
        'fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 lg:hidden',
        // The full-width transparent nav must not eat taps meant for content
        // showing through beside the floating capsule.
        'pointer-events-none',
        suppressed && 'hidden',
        !showLabels && 'dock-collapsed',
      )}
      // Layout only here; the glass itself (blur, tint, rim, lift) lives in
      // .dock-capsule so it can vary per theme. rounded-full rather than a fixed
      // radius: a true capsule, and it keeps the pill inside concentric with it
      // at any height the collapse animates through.
      trackClassName={cn(
        'dock-capsule pointer-events-auto mx-auto flex touch-pan-y',
        'items-stretch justify-center rounded-full px-2',
      )}
      pillClassName="dock-pill inset-y-1 z-0 rounded-full"
    >
      {(readIndex) => (
        <>
          {items.map((item, index) => (
            <DockTab
              key={item.key}
              item={item}
              index={index}
              selected={index === readIndex}
              // Marked from the ROUTE, never the drag preview: a previewed tab
              // is not the current page until release, and announcing it
              // mid-gesture is wrong for anyone using assistive tech.
              current={index === activeIndex}
              label={t(item.labelKey)}
              onOverflow={onOverflow}
            />
          ))}
        </>
      )}
    </SegmentedControl>
  )
}

function DockTab({
  item,
  index,
  selected,
  current,
  label,
  onOverflow,
}: {
  item: DockItem
  index: number
  selected: boolean
  current: boolean
  label: string
  onOverflow?: () => void
}) {
  const Icon = item.icon
  const content = (
    <>
      {/* Decorative: the visible label already names the destination. */}
      <span
        aria-hidden
        className={cn(
          'relative flex size-6 items-center justify-center rounded-full',
          // Both children are sized here so the avatar cannot render larger than
          // the glyphs it sits beside. cn() is clsx, so a className on <Avatar>
          // would not have displaced its own size-9.
          '[&>svg]:size-5 [&>span]:size-5',
          // A hero tab's tint sits on this wrapper at a FIXED size, so it can
          // never nudge the label baseline that the collapse animation measures.
          item.accent &&
            !selected &&
            'bg-(--color-accent-400)/15 text-(--color-accent-350)',
        )}
      >
        {item.avatar ? (
          <Avatar
            name={item.avatar.name}
            src={item.avatar.src}
            color={item.avatar.color}
            className="text-[0.5rem]"
          />
        ) : (
          <Icon />
        )}
        {item.badge && (
          <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-(--color-danger) ring-2 ring-(--color-surface-1)" />
        )}
      </span>
      <span className="dock-label">{label}</span>
    </>
  )

  const className = cn(
    // 44px floor on the touch target, held even when the labels collapse.
    // .dock-tab owns the height floor and the 44px touch target — see app.css.
    'dock-tab relative isolate z-10 flex min-w-12 flex-col items-center justify-center',
    'rounded-full px-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent-400)',
    'transition-colors',
    // Colour follows the finger, weight follows the ROUTE. Bolding the previewed
    // tab reflowed the row by a pixel as the preview moved, which both jitters
    // the pill and shifts tabs under a commit already in flight.
    current ? 'font-medium' : 'font-normal',
    selected ? 'text-(--color-accent-fg)' : 'text-(--color-ink-muted)',
  )

  if (!item.to) {
    return (
      <button
        type="button"
        data-segment-index={index}
        onClick={onOverflow}
        aria-label={label}
        className={className}
      >
        {content}
      </button>
    )
  }

  return (
    <Link
      to={item.to}
      data-segment-index={index}
      aria-current={current ? 'page' : undefined}
      className={className}
    >
      {content}
    </Link>
  )
}
