import type { AttendanceStatus } from '@/types/domain'

export const LOW_AVERAGE_THRESHOLD = 70

/**
 * A computed grade is provisional until every configured input is present, but
 * it is still eligible for a low-average incident below this threshold. The
 * notification recipient is selected by the database from the classroom owner.
 */
export function shouldNotifyLowAverage(finalGrade: number | null) {
  return finalGrade !== null && finalGrade < LOW_AVERAGE_THRESHOLD
}

export interface AttendanceStreakSession {
  status: AttendanceStatus | null
  sessionDate: string
  createdAt: string
}

/**
 * Counts the current run of recorded, unexcused absences. Input may contain
 * sessions with no record for the student; an unknown record breaks the run so
 * a missing attendance mark cannot be treated as a confirmed absence. Any
 * recorded non-absent status also resolves the streak.
 */
export function consecutiveUnexcusedAbsences(
  sessions: readonly AttendanceStreakSession[],
): number {
  const newestFirst = [...sessions].sort((a, b) => {
    const byDate = b.sessionDate.localeCompare(a.sessionDate)
    return byDate || b.createdAt.localeCompare(a.createdAt)
  })

  let streak = 0
  for (const session of newestFirst) {
    if (session.status === null) break
    if (session.status !== 'absent') break
    streak += 1
  }
  return streak
}
