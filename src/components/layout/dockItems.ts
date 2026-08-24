/**
 * Item model and per-audience item sets for the bottom dock.
 *
 * Kept out of the component module deliberately: a file that mixes components
 * with plain helpers drops Fast Refresh back to a full page reload on every
 * edit.
 */
import type { ReactNode } from 'react'
import type { MessageKey } from '@/lib/locale'

export interface DockItem {
  /** Stable identity, independent of label or route. */
  key: string
  labelKey: MessageKey
  icon: (props: { className?: string }) => ReactNode
  /** Destination. Omit for an item that runs an action instead of navigating. */
  to?: string
  /** Index routes must match exactly or every child route lights them up. */
  exact?: boolean
  /**
   * Renders a dot, never a number. "Something needs you" is the whole signal;
   * a count is unreadable at label size and invites precision the badge cannot
   * honour.
   */
  badge?: boolean
  /**
   * Replaces the glyph on the account tab. A generic person icon among five
   * glyphs says "some account"; a face or initials says "yours".
   */
  avatar?: { name?: string | null; src?: string | null; color?: string | null }
  /**
   * A hero tab keeps a soft tint when NOT selected. Additive to the pill, so
   * "hero" and "selected" stay distinguishable.
   */
  accent?: boolean
}

export interface DockAudience {
  ariaLabelKey: MessageKey
  items: DockItem[]
}

/** True when `pathname` is the item's route (or a child of it). */
export function isItemActive(item: DockItem, pathname: string): boolean {
  if (!item.to) return false
  return item.exact
    ? pathname === item.to
    : pathname === item.to || pathname.startsWith(`${item.to}/`)
}

/**
 * Index that should read as current, or -1 when the route belongs to none of
 * the tabs. Longest match wins so `/teacher/classrooms/x` prefers Classes over
 * a shorter prefix.
 */
export function activeDockIndex(items: readonly DockItem[], pathname: string): number {
  let best = -1
  let bestLength = -1
  items.forEach((item, index) => {
    if (!isItemActive(item, pathname)) return
    const length = item.to?.length ?? 0
    if (length > bestLength) {
      bestLength = length
      best = index
    }
  })
  return best
}
