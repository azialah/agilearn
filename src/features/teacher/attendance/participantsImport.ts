/**
 * Pure parsing + matching for a Google Meet participants `.txt` export.
 *
 * No React, no Supabase, no DOM — operates on the raw file text and a roster
 * array. Kept pure so the messy real-world matching logic is unit-testable
 * in isolation (see participantsImport.test.ts).
 *
 * Line shape: `Name | Entry: HH:MM:SS, Total time: X min Y secs` — the `|`
 * segment is optional (some exports omit timing for a participant). The timing
 * half is split off so it cannot pollute the name tokens, then discarded: the
 * import records who was present, never when they joined or how long they
 * stayed.
 *
 * `Name` is inconsistent in the wild: `Last, First MI.`, `LASTNAME, FIRSTNAME`,
 * `First Last` with no comma at all, embedded suffixes (`Last, First JR., MI.`),
 * and diacritics. Matching is therefore order-independent and never assumes
 * which word is the surname.
 */

import type { Student } from '@/types/domain'

export type RosterStudent = Pick<
  Student,
  'id' | 'last_name' | 'first_name' | 'middle_initial'
>

export type LineOutcome = 'matched' | 'ambiguous' | 'unmatched' | 'teacher'

export interface AttendanceImportRow {
  /**
   * Every spelling the file used for this person. More than one means the same
   * participant appeared under different spellings — see mergeByStudent().
   */
  rawNames: string[]
  occurrences: number
  outcome: LineOutcome
  matchedStudentId: string | null
  candidateIds: string[]
}

export interface AttendanceImportResult {
  rows: AttendanceImportRow[]
  counts: { matched: number; ambiguous: number; unmatched: number; teacher: number }
}

export interface ParseOptions {
  /** The signed-in teacher's display name, so the host line reads as "you". */
  teacherName?: string | null
}

const SUFFIX_TOKENS = new Set(['JR', 'SR', 'II', 'III', 'IV'])

function normalizeToken(raw: string): string {
  // NFD splits Ñ into N + a combining tilde; the final strip below (not A-Z)
  // removes the combining mark along with punctuation, so no separate
  // diacritic-stripping step is needed.
  return raw
    .normalize('NFD')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
}

function tokenize(name: string): string[] {
  return name
    .split(',')
    .flatMap((segment) => segment.trim().split(/\s+/))
    .map(normalizeToken)
    .filter((token) => token.length > 0 && !SUFFIX_TOKENS.has(token))
}

/** Names, with the `Entry:`/`Total time:` half already stripped and dropped. */
function parseNames(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => {
      const pipeIndex = line.indexOf('|')
      return (pipeIndex === -1 ? line : line.slice(0, pipeIndex)).trim()
    })
    .filter(Boolean)
}

interface NameGroup {
  rawName: string
  tokens: string[]
  occurrences: number
}

/** Groups by token set (not raw text) so rejoin lines with drifting whitespace still merge. */
function groupByName(names: string[]): NameGroup[] {
  const groups = new Map<string, NameGroup>()
  for (const name of names) {
    const tokens = tokenize(name)
    if (tokens.length === 0) continue
    const key = [...new Set(tokens)].sort().join('|')
    const existing = groups.get(key)
    if (existing) existing.occurrences += 1
    else groups.set(key, { rawName: name, tokens, occurrences: 1 })
  }
  return [...groups.values()]
}

interface RosterTokens {
  student: RosterStudent
  lastTokens: Set<string>
  firstTokens: Set<string>
  allTokens: Set<string>
}

function tokenizeRoster(roster: readonly RosterStudent[]): RosterTokens[] {
  return roster.map((student) => {
    const lastTokens = new Set(tokenize(student.last_name))
    const firstTokens = new Set(tokenize(student.first_name))
    const middle = student.middle_initial ? normalizeToken(student.middle_initial) : ''
    return {
      student,
      lastTokens,
      firstTokens,
      allTokens: new Set([...lastTokens, ...firstTokens, ...(middle ? [middle] : [])]),
    }
  })
}

function matchGroup(
  tokens: string[],
  roster: RosterTokens[],
): { outcome: LineOutcome; matchedStudentId: string | null; candidateIds: string[] } {
  const anchored = roster.filter(
    (candidate) =>
      [...candidate.lastTokens].some((t) => tokens.includes(t)) &&
      [...candidate.firstTokens].some((t) => tokens.includes(t)),
  )
  if (anchored.length === 0) {
    return { outcome: 'unmatched', matchedStudentId: null, candidateIds: [] }
  }

  const scored = anchored
    .map((candidate) => ({
      id: candidate.student.id,
      score: tokens.filter((t) => candidate.allTokens.has(t)).length,
    }))
    .sort((a, b) => b.score - a.score)
  const topScore = scored[0].score
  const winners = scored.filter((c) => c.score === topScore)

  return winners.length === 1
    ? {
        outcome: 'matched',
        matchedStudentId: winners[0].id,
        candidateIds: [winners[0].id],
      }
    : {
        outcome: 'ambiguous',
        matchedStudentId: null,
        candidateIds: winners.map((w) => w.id),
      }
}

/**
 * Is this line the meeting host rather than a student?
 *
 * Only ever asked of a line that failed to match the roster, so a student who
 * happens to share the teacher's name still resolves to that student. Requires
 * two shared tokens and a subset relationship in one direction, so `Lopez, John`
 * matches `John Neo Lopez` while a lone shared surname does not.
 */
function isTeacher(tokens: string[], teacherTokens: string[]): boolean {
  if (teacherTokens.length === 0) return false
  const line = new Set(tokens)
  const teacher = new Set(teacherTokens)
  const shared = [...line].filter((token) => teacher.has(token))
  if (shared.length < 2) return false
  return shared.length === line.size || shared.length === teacher.size
}

/**
 * Collapse rows that resolved to the same student.
 *
 * A real export spells one participant more than one way — `IGNACIO, ROMUALNICO
 * S.` on one line and `ROMUALNICO IGNACIO` on another. Those have different
 * token sets, so groupByName() keeps them apart, but they are one person. Left
 * alone they produce two inserts sharing a (session_id, student_id), which
 * Postgres rejects outright with 21000: "ON CONFLICT DO UPDATE command cannot
 * affect row a second time" — failing the whole import, not just the row.
 *
 * Merging here rather than at the call site means no caller can rebuild the
 * invalid batch.
 */
function mergeByStudent(rows: AttendanceImportRow[]): AttendanceImportRow[] {
  const byStudent = new Map<string, AttendanceImportRow>()
  const merged: AttendanceImportRow[] = []
  for (const row of rows) {
    if (!row.matchedStudentId) {
      merged.push(row)
      continue
    }
    const existing = byStudent.get(row.matchedStudentId)
    if (existing) {
      existing.rawNames.push(...row.rawNames)
      existing.occurrences += row.occurrences
    } else {
      byStudent.set(row.matchedStudentId, row)
      merged.push(row)
    }
  }
  return merged
}

export function parseAttendanceImport(
  text: string,
  roster: readonly RosterStudent[],
  options: ParseOptions = {},
): AttendanceImportResult {
  const rosterTokens = tokenizeRoster(roster)
  const teacherTokens = options.teacherName ? tokenize(options.teacherName) : []
  const groups = groupByName(parseNames(text))

  const rows = mergeByStudent(
    groups.map((group) => {
      const match = matchGroup(group.tokens, rosterTokens)
      const outcome: LineOutcome =
        match.outcome === 'unmatched' && isTeacher(group.tokens, teacherTokens)
          ? 'teacher'
          : match.outcome
      return {
        rawNames: [group.rawName],
        occurrences: group.occurrences,
        outcome,
        matchedStudentId: match.matchedStudentId,
        candidateIds: match.candidateIds,
      }
    }),
  )

  const counts = { matched: 0, ambiguous: 0, unmatched: 0, teacher: 0 }
  for (const row of rows) counts[row.outcome] += 1

  return { rows, counts }
}

export interface ImportPlan {
  /** Matched students with no record yet — the import marks these present. */
  present: string[]
  /** Roster students absent from the file and not yet recorded. */
  absent: string[]
  /** Already recorded by hand; the import leaves these alone. */
  alreadyRecorded: string[]
}

/**
 * Split the roster into what the import may write and what it must not.
 *
 * A student who is already recorded lands in `alreadyRecorded` whether or not
 * the file mentions them — a manual Excused always outranks the meeting log.
 */
export function planFromResult(
  result: AttendanceImportResult,
  roster: readonly RosterStudent[],
  recordedStudentIds: readonly string[],
): ImportPlan {
  const recorded = new Set(recordedStudentIds)
  const inFile = new Set(
    result.rows
      .map((row) => row.matchedStudentId)
      .filter((id): id is string => id !== null),
  )

  const plan: ImportPlan = { present: [], absent: [], alreadyRecorded: [] }
  for (const student of roster) {
    if (recorded.has(student.id)) plan.alreadyRecorded.push(student.id)
    else if (inFile.has(student.id)) plan.present.push(student.id)
    else plan.absent.push(student.id)
  }
  return plan
}
