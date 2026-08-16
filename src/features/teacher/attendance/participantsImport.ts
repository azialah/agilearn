/**
 * Pure parsing + matching for a Google Meet participants `.txt` export.
 *
 * No React, no Supabase, no DOM — operates on the raw file text and a roster
 * array. Kept pure so the messy real-world matching logic is unit-testable
 * in isolation (see participantsImport.test.ts).
 *
 * Line shape: `Name | Entry: HH:MM:SS, Total time: X min Y secs` — the `|`
 * segment is optional (some exports omit timing for a participant). `Name`
 * is inconsistent in the wild: `Last, First MI.`, `LASTNAME, FIRSTNAME`,
 * `First Last` with no comma at all, embedded suffixes (`Last, First JR., MI.`),
 * and diacritics. Matching is therefore order-independent and never assumes
 * which word is the surname.
 */

import type { Student } from '@/types/domain'

export type RosterStudent = Pick<
  Student,
  'id' | 'last_name' | 'first_name' | 'middle_initial'
>

export type LineOutcome = 'matched' | 'ambiguous' | 'unmatched'

export interface AttendanceImportRow {
  rawName: string
  remarks: string
  occurrences: number
  outcome: LineOutcome
  matchedStudentId: string | null
  candidateIds: string[]
}

export interface AttendanceImportResult {
  rows: AttendanceImportRow[]
  counts: { matched: number; ambiguous: number; unmatched: number }
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

interface RawLine {
  name: string
  meta: string
}

function parseLines(text: string): RawLine[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const pipeIndex = line.indexOf('|')
      return pipeIndex === -1
        ? { name: line, meta: '' }
        : {
            name: line.slice(0, pipeIndex).trim(),
            meta: line.slice(pipeIndex + 1).trim(),
          }
    })
    .filter((line) => line.name.length > 0)
}

interface NameGroup {
  rawName: string
  tokens: string[]
  metas: string[]
}

/** Groups by token set (not raw text) so rejoin lines with drifting whitespace still merge. */
function groupByName(lines: RawLine[]): NameGroup[] {
  const groups = new Map<string, NameGroup>()
  for (const line of lines) {
    const tokens = tokenize(line.name)
    if (tokens.length === 0) continue
    const key = [...new Set(tokens)].sort().join('|')
    const existing = groups.get(key)
    if (existing) existing.metas.push(line.meta)
    else groups.set(key, { rawName: line.name, tokens, metas: [line.meta] })
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

export function parseAttendanceImport(
  text: string,
  roster: readonly RosterStudent[],
): AttendanceImportResult {
  const rosterTokens = tokenizeRoster(roster)
  const groups = groupByName(parseLines(text))
  const counts = { matched: 0, ambiguous: 0, unmatched: 0 }

  const rows: AttendanceImportRow[] = groups.map((group) => {
    const match = matchGroup(group.tokens, rosterTokens)
    counts[match.outcome] += 1
    return {
      rawName: group.rawName,
      remarks: group.metas.filter(Boolean).join('; '),
      occurrences: group.metas.length,
      outcome: match.outcome,
      matchedStudentId: match.matchedStudentId,
      candidateIds: match.candidateIds,
    }
  })

  return { rows, counts }
}
