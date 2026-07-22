export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

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
