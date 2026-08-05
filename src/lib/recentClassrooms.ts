const STORAGE_KEY = 'agilearn-recent-classrooms'
const LIMIT = 5

/**
 * Classrooms the teacher actually opened, most recent first.
 *
 * The sidebar used to list the most recently *created* classrooms, which is
 * rarely the one being taught today. Visits are local to the device — a
 * per-teacher column would sync across devices but costs a write on every page
 * view, and this is a convenience list, not data.
 *
 * Same storage discipline as lastRoute.ts: every access is guarded, because
 * private mode makes localStorage throw and none of this is required.
 */
export function readRecentClassrooms(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((id): id is string => typeof id === 'string').slice(0, LIMIT)
  } catch {
    return []
  }
}

export function rememberClassroomVisit(classroomId: string): void {
  if (!classroomId) return
  try {
    const next = [
      classroomId,
      ...readRecentClassrooms().filter((id) => id !== classroomId),
    ]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(0, LIMIT)))
  } catch {
    // ignore
  }
}

/** Recently visited first, then everything else in its existing order. */
export function sortByRecentVisit<T extends { id: string }>(
  classrooms: readonly T[],
  recentIds: readonly string[],
): T[] {
  const rank = new Map(recentIds.map((id, index) => [id, index]))
  return [...classrooms].sort((a, b) => {
    const aRank = rank.get(a.id) ?? Number.MAX_SAFE_INTEGER
    const bRank = rank.get(b.id) ?? Number.MAX_SAFE_INTEGER
    return aRank - bRank
  })
}
