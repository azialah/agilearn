import type { AttendanceStatus } from '@/types/domain'

export const LOW_AVERAGE_THRESHOLD = 70

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
 * sessions with no record for the student; those are unknown and do not extend
 * the run. Any recorded non-absent status resolves the streak.
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
    if (session.status === null) continue
    if (session.status !== 'absent') break
    streak += 1
  }
  return streak
}
