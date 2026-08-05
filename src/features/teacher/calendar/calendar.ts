import type { CourseSubjectKind } from '@/types/domain'

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

/** A lecture and its laboratory run at different lengths by convention. */
export const DEFAULT_DURATION_HOURS: Record<CourseSubjectKind, number> = {
  lecture: 2,
  laboratory: 3,
  other: 1,
}

/** "08:00" + 2 -> "10:00". Clamps to 23:59 so a late start never wraps past
 * midnight into a time that would fail the ends_at > starts_at DB check. */
export function addHours(time: string, hours: number): string {
  const [hour, minute] = time.slice(0, 5).split(':').map(Number)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return time
  const total = Math.min(hour * 60 + minute + hours * 60, 23 * 60 + 59)
  const nextHour = Math.floor(total / 60)
  const nextMinute = total % 60
  return `${String(nextHour).padStart(2, '0')}:${String(nextMinute).padStart(2, '0')}`
}

export function startOfSundayWeek(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  next.setDate(next.getDate() - next.getDay())
  return next
}

export function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function toDateKey(date: Date) {
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

export function localDayRange(date: Date) {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const end = addDays(start, 1)
  return { start: start.toISOString(), end: end.toISOString() }
}

export function meetingMinutes(startsAt: string, endsAt: string) {
  const [startHour, startMinute] = startsAt.slice(0, 5).split(':').map(Number)
  const [endHour, endMinute] = endsAt.slice(0, 5).split(':').map(Number)
  return endHour * 60 + endMinute - (startHour * 60 + startMinute)
}

export interface SlotLike {
  weekday: number
  /** 'HH:MM' from an <input type="time"> or 'HH:MM:SS' from Postgres. */
  starts_at: string
  ends_at: string
}

export function schedulesOverlap(first: SlotLike, second: SlotLike) {
  // Strict `<` on both sides, so a class ending at 11:00 and one starting at
  // 11:00 are not a conflict. This matches the `[)` bound of the tsrange in the
  // database's EXCLUDE constraint — the two must agree or the UI will promise
  // something the DB rejects.
  return (
    first.weekday === second.weekday &&
    normalizeTime(first.starts_at) < normalizeTime(second.ends_at) &&
    normalizeTime(second.starts_at) < normalizeTime(first.ends_at)
  )
}

/** 'HH:MM' and 'HH:MM:SS' must compare correctly against each other. */
function normalizeTime(value: string) {
  return value.length === 5 ? `${value}:00` : value
}

/**
 * Every existing slot the proposal collides with. `existing` is the teacher's
 * whole timetable — `useMeetingSlots()` already returns exactly that under RLS —
 * so a clash with a different section of a different classroom is caught too.
 * Callers editing a slot must filter that slot out first.
 */
export function findSlotConflicts<T extends SlotLike>(
  proposed: SlotLike,
  existing: readonly T[],
): T[] {
  if (!proposed.starts_at || !proposed.ends_at) return []
  if (normalizeTime(proposed.starts_at) >= normalizeTime(proposed.ends_at)) return []
  return existing.filter((slot) => schedulesOverlap(proposed, slot))
}

/** "Mon 10:00 AM–12:00 PM overlaps CS Elective 1 Lab (Mon 11:00 AM–1:00 PM)" */
export function conflictReason(
  proposed: SlotLike,
  conflict: SlotLike,
  conflictLabel: string,
) {
  const day = WEEKDAY_LABELS[proposed.weekday] ?? ''
  return `${day} ${formatTimeRange(proposed)} overlaps ${conflictLabel} (${day} ${formatTimeRange(conflict)})`
}

function formatTimeRange(slot: SlotLike) {
  return `${to12Hour(slot.starts_at)}–${to12Hour(slot.ends_at)}`
}

/** "13:00" -> "1:00 PM"; anything unparseable is passed through untouched. */
export function to12Hour(value: string): string {
  const [rawHour, minute] = value.split(':')
  const hour = Number(rawHour)
  if (!Number.isFinite(hour) || minute === undefined) return value
  const suffix = hour < 12 ? 'AM' : 'PM'
  const hour12 = hour % 12 === 0 ? 12 : hour % 12
  return `${hour12}:${minute} ${suffix}`
}

/** Day + start + end as one display string: "Mon 10:00 AM–12:00 PM". */
export function formatSchedule(day: string, start: string, end: string): string {
  if (!day || !start || !end) return ''
  return `${day} ${to12Hour(start)}–${to12Hour(end)}`
}
