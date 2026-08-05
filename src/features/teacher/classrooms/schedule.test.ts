import { describe, expect, it } from 'vitest'
import { formatSchedule } from '@/features/teacher/calendar/calendar'

describe('formatSchedule', () => {
  it('renders a 24-hour range in 12-hour form', () => {
    expect(formatSchedule('Mon', '10:00', '12:00')).toBe('Mon 10:00 AM–12:00 PM')
    expect(formatSchedule('Fri', '13:30', '15:00')).toBe('Fri 1:30 PM–3:00 PM')
  })

  it('keeps midnight and noon readable', () => {
    expect(formatSchedule('Tue', '00:15', '12:45')).toBe('Tue 12:15 AM–12:45 PM')
  })

  it('is empty until the day and both times are set', () => {
    expect(formatSchedule('', '10:00', '12:00')).toBe('')
    expect(formatSchedule('Mon', '10:00', '')).toBe('')
  })
})
