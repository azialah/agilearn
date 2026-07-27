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

export function schedulesOverlap(
  first: { weekday: number; starts_at: string; ends_at: string },
  second: { weekday: number; starts_at: string; ends_at: string },
) {
  return (
    first.weekday === second.weekday &&
    first.starts_at < second.ends_at &&
    second.starts_at < first.ends_at
  )
}
