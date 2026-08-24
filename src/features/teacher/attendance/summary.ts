/**
 * Pure attendance-summary helpers.
 *
 * No React, no Supabase — just tallying and rate math over attendance records.
 * Covered by `summary.test.ts`.
 *
 * Rate model
 * ----------
 * A student's attendance rate counts sessions where they were physically there
 * (present or late) against sessions that count toward attendance (present,
 * late or absent). Excused sessions are deliberately excluded from both the
 * numerator and the denominator — an excused absence neither helps nor hurts.
 * Sessions with no record for the student are ignored entirely (unrecorded, not
 * "absent").
 */
import type { AttendanceRecord, AttendanceStatus, Student } from '@/types/domain'

/** Canonical status order used across the UI (toggle cycle + table columns). */
export const ATTENDANCE_STATUSES: readonly AttendanceStatus[] = [
  'present',
  'late',
  'excused',
  'absent',
] as const

export type StatusCounts = Record<AttendanceStatus, number>

export function emptyCounts(): StatusCounts {
  return { present: 0, late: 0, excused: 0, absent: 0 }
}

/** Tally a flat list of records by status. */
export function tallyStatuses(
  records: readonly Pick<AttendanceRecord, 'status'>[],
): StatusCounts {
  const counts = emptyCounts()
  for (const record of records) counts[record.status] += 1
  return counts
}

/**
 * Attendance rate in [0, 1], or null when nothing counts yet.
 * See the rate model note at the top of the file.
 */
export function attendanceRate(counts: StatusCounts): number | null {
  const counted = counts.present + counts.late + counts.absent
  if (counted === 0) return null
  return (counts.present + counts.late) / counted
}

export interface StudentAttendanceSummary {
  studentId: string
  counts: StatusCounts
  /** Total records that exist for this student (all four statuses). */
  recorded: number
  /** Sessions counting toward the rate (present + late + absent). */
  counted: number
  /** Attendance rate in [0, 1], or null when no counted sessions exist. */
  rate: number | null
}

export function computeStudentSummary(
  studentId: string,
  records: readonly Pick<AttendanceRecord, 'status'>[],
): StudentAttendanceSummary {
  const counts = tallyStatuses(records)
  const recorded = counts.present + counts.late + counts.excused + counts.absent
  const counted = counts.present + counts.late + counts.absent
  return { studentId, counts, recorded, counted, rate: attendanceRate(counts) }
}

/** Bucket records by their student_id. */
export function groupRecordsByStudent(
  records: readonly Pick<AttendanceRecord, 'student_id' | 'status'>[],
): Map<string, Pick<AttendanceRecord, 'status'>[]> {
  const grouped = new Map<string, Pick<AttendanceRecord, 'status'>[]>()
  for (const record of records) {
    const bucket = grouped.get(record.student_id)
    if (bucket) bucket.push(record)
    else grouped.set(record.student_id, [record])
  }
  return grouped
}

/**
 * Build a summary row for every student in the roster (students with no
 * records still appear, with an all-zero tally and a null rate).
 */
export function computeClassSummary(
  students: readonly Pick<Student, 'id'>[],
  records: readonly Pick<AttendanceRecord, 'student_id' | 'status'>[],
): StudentAttendanceSummary[] {
  const grouped = groupRecordsByStudent(records)
  return students.map((student) =>
    computeStudentSummary(student.id, grouped.get(student.id) ?? []),
  )
}

/** Overall class attendance rate across every record (null when empty). */
export function computeClassAttendanceRate(
  records: readonly Pick<AttendanceRecord, 'status'>[],
): number | null {
  return attendanceRate(tallyStatuses(records))
}

export interface SessionTrendPoint {
  sessionId: string
  /** Attendance rate for this session in [0, 1], or null when unrecorded. */
  rate: number | null
  recorded: number
}

/**
 * Per-session attendance rate, oldest first, for a small trend chart.
 * Input order is preserved after reversing so callers can pass newest-first
 * session lists (as the API returns them) and get chronological output.
 */
export function computeSessionTrend(
  sessions: readonly {
    id: string
    attendance_records: readonly Pick<AttendanceRecord, 'status'>[]
  }[],
): SessionTrendPoint[] {
  return sessions
    .map((session) => {
      const counts = tallyStatuses(session.attendance_records)
      return {
        sessionId: session.id,
        rate: attendanceRate(counts),
        recorded: counts.present + counts.late + counts.excused + counts.absent,
      }
    })
    .reverse()
}

export interface SessionMonth<T> {
  /** `YYYY-MM`, taken straight off the date string. */
  key: string
  sessions: T[]
}

/**
 * Bucket sessions into calendar months, preserving the order they arrive in.
 *
 * The key is sliced off the `YYYY-MM-DD` string rather than parsed into a Date:
 * `session_date` is a wall-clock school day, and constructing a Date from it
 * shifts the month across a timezone boundary for anyone west of UTC.
 *
 * Only adjacent runs are merged, so callers must pass date-ordered sessions —
 * which `useClassSessions` does. Unordered input yields one group per run, and
 * two groups can then share a key.
 */
export function groupSessionsByMonth<T extends { session_date: string }>(
  sessions: readonly T[],
): SessionMonth<T>[] {
  const months: SessionMonth<T>[] = []
  for (const session of sessions) {
    const key = session.session_date.slice(0, 7)
    const current = months.at(-1)
    if (current?.key === key) current.sessions.push(session)
    else months.push({ key, sessions: [session] })
  }
  return months
}

export type SummarySort = 'name' | 'rate'

/** Format a rate in [0, 1] as a whole-percent string, or an em dash when null. */
export function formatRate(rate: number | null): string {
  if (rate === null) return '—'
  return `${Math.round(rate * 100)}%`
}
