/**
 * Postgres rejects overlapping meetings with an EXCLUDE violation and a
 * lecture/lab on a non-college classroom with a check violation. Neither
 * message is fit for a teacher, so map the codes here rather than letting a
 * constraint name reach a toast.
 */
export function meetingSlotErrorMessage(error: unknown): string {
  const code =
    typeof error === 'object' && error && 'code' in error ? error.code : undefined

  if (code === '23P01') {
    return 'That time overlaps another class you teach. Pick a different time or day.'
  }
  if (code === '23514') {
    // The trigger's own message is written for teachers; prefer it when present.
    const message =
      typeof error === 'object' && error && 'message' in error
        ? String(error.message)
        : ''
    return message || 'That combination is not allowed for this classroom.'
  }
  return error instanceof Error ? error.message : 'Something went wrong.'
}
