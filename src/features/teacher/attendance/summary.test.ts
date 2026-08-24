import { describe, it, expect } from 'vitest'
import {
  ATTENDANCE_STATUSES,
  attendanceRate,
  computeClassAttendanceRate,
  computeClassSummary,
  computeSessionTrend,
  computeStudentSummary,
  emptyCounts,
  formatRate,
  groupRecordsByStudent,
  groupSessionsByMonth,
  tallyStatuses,
} from './summary'
import type { AttendanceStatus } from '@/types/domain'

function rec(student_id: string, status: AttendanceStatus) {
  return { student_id, status }
}

describe('tallyStatuses', () => {
  it('counts each status', () => {
    const counts = tallyStatuses([
      { status: 'present' },
      { status: 'present' },
      { status: 'late' },
      { status: 'absent' },
    ])
    expect(counts).toEqual({ present: 2, late: 1, excused: 0, absent: 1 })
  })

  it('returns all zeros for no records', () => {
    expect(tallyStatuses([])).toEqual(emptyCounts())
  })
})

describe('attendanceRate', () => {
  it('counts present and late as attended', () => {
    const counts = { present: 3, late: 1, excused: 0, absent: 0 }
    expect(attendanceRate(counts)).toBe(1)
  })

  it('penalizes absences', () => {
    const counts = { present: 3, late: 0, excused: 0, absent: 1 }
    expect(attendanceRate(counts)).toBe(0.75)
  })

  it('excludes excused from numerator and denominator', () => {
    // 2 attended out of 2 counted; the excused record is ignored entirely.
    const counts = { present: 2, late: 0, excused: 5, absent: 0 }
    expect(attendanceRate(counts)).toBe(1)
  })

  it('returns null when nothing counts', () => {
    expect(attendanceRate({ present: 0, late: 0, excused: 3, absent: 0 })).toBeNull()
    expect(attendanceRate(emptyCounts())).toBeNull()
  })
})

describe('computeStudentSummary', () => {
  it('summarizes a mixed record set', () => {
    const summary = computeStudentSummary('s1', [
      { status: 'present' },
      { status: 'late' },
      { status: 'absent' },
      { status: 'excused' },
    ])
    expect(summary.studentId).toBe('s1')
    expect(summary.counts).toEqual({ present: 1, late: 1, excused: 1, absent: 1 })
    expect(summary.recorded).toBe(4)
    expect(summary.counted).toBe(3)
    expect(summary.rate).toBeCloseTo(2 / 3)
  })

  it('handles a student with no records', () => {
    const summary = computeStudentSummary('s1', [])
    expect(summary.recorded).toBe(0)
    expect(summary.counted).toBe(0)
    expect(summary.rate).toBeNull()
  })
})

describe('groupRecordsByStudent', () => {
  it('buckets records by student_id', () => {
    const grouped = groupRecordsByStudent([
      rec('a', 'present'),
      rec('b', 'absent'),
      rec('a', 'late'),
    ])
    expect(grouped.get('a')).toHaveLength(2)
    expect(grouped.get('b')).toHaveLength(1)
    expect(grouped.has('c')).toBe(false)
  })
})

describe('computeClassSummary', () => {
  it('includes every student, even those without records', () => {
    const students = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    const records = [rec('a', 'present'), rec('a', 'absent'), rec('b', 'present')]
    const rows = computeClassSummary(students, records)
    expect(rows).toHaveLength(3)
    const byId = new Map(rows.map((r) => [r.studentId, r]))
    expect(byId.get('a')?.rate).toBe(0.5)
    expect(byId.get('b')?.rate).toBe(1)
    expect(byId.get('c')?.rate).toBeNull()
    expect(byId.get('c')?.recorded).toBe(0)
  })
})

describe('computeClassAttendanceRate', () => {
  it('aggregates across all records', () => {
    const rate = computeClassAttendanceRate([
      { status: 'present' },
      { status: 'present' },
      { status: 'absent' },
      { status: 'excused' },
    ])
    // 2 attended / 3 counted
    expect(rate).toBeCloseTo(2 / 3)
  })

  it('is null with no counted records', () => {
    expect(computeClassAttendanceRate([])).toBeNull()
  })
})

describe('computeSessionTrend', () => {
  it('reverses newest-first input into chronological points', () => {
    const trend = computeSessionTrend([
      { id: 'newest', attendance_records: [{ status: 'absent' }] },
      { id: 'oldest', attendance_records: [{ status: 'present' }] },
    ])
    expect(trend.map((p) => p.sessionId)).toEqual(['oldest', 'newest'])
    expect(trend[0].rate).toBe(1)
    expect(trend[1].rate).toBe(0)
  })

  it('marks unrecorded sessions with a null rate', () => {
    const trend = computeSessionTrend([{ id: 's', attendance_records: [] }])
    expect(trend[0].rate).toBeNull()
    expect(trend[0].recorded).toBe(0)
  })
})

describe('formatRate', () => {
  it('formats fractions as whole percents', () => {
    expect(formatRate(1)).toBe('100%')
    expect(formatRate(0.756)).toBe('76%')
    expect(formatRate(0)).toBe('0%')
  })

  it('renders an em dash for null', () => {
    expect(formatRate(null)).toBe('—')
  })
})

describe('ATTENDANCE_STATUSES', () => {
  it('lists all four statuses in cycle order', () => {
    expect([...ATTENDANCE_STATUSES]).toEqual(['present', 'late', 'excused', 'absent'])
  })
})

describe('groupSessionsByMonth', () => {
  const session = (session_date: string) => ({ session_date })

  it('buckets by calendar month and preserves order', () => {
    const months = groupSessionsByMonth([
      session('2026-08-17'),
      session('2026-08-03'),
      session('2026-07-27'),
    ])
    expect(months.map((m) => m.key)).toEqual(['2026-08', '2026-07'])
    expect(months[0].sessions.map((s) => s.session_date)).toEqual([
      '2026-08-17',
      '2026-08-03',
    ])
  })

  it('returns no groups for an empty list', () => {
    expect(groupSessionsByMonth([])).toEqual([])
  })

  it('keeps every session — none are dropped between groups', () => {
    const dates = ['2026-08-17', '2026-08-03', '2026-07-27', '2026-06-01']
    const months = groupSessionsByMonth(dates.map(session))
    expect(months.flatMap((m) => m.sessions).map((s) => s.session_date)).toEqual(dates)
  })

  it('reads the month off the string rather than a parsed date', () => {
    // A UTC-midnight Date built from this string lands on 2025-12-31 anywhere
    // west of UTC, which would file a January session under December.
    expect(groupSessionsByMonth([session('2026-01-01')])[0].key).toBe('2026-01')
  })
})
