/**
 * Pure parsing / validation helpers for the roster import + export filenames.
 *
 * These functions have NO dependency on the `xlsx` runtime or the DOM — they
 * operate on a plain array-of-arrays (the shape SheetJS produces with
 * `sheet_to_json(ws, { header: 1 })`). Keeping them pure makes the tricky
 * skip-rows / dedupe logic unit-testable in isolation.
 *
 * Column contract (legacy parity, see StudentsImport.php):
 *   0: student no   1: last name   2: first name   3: middle initial
 * The legacy template also carried course/year/block/grade columns; the current
 * schema ignores those, so we only read the first four columns.
 */

export type RowStatus = 'new' | 'duplicate' | 'invalid'

export interface ParsedRosterRow {
  /** 1-based original spreadsheet row number, for display in the preview. */
  rowNumber: number
  studentNo: string
  lastName: string
  firstName: string
  middleInitial: string
  status: RowStatus
  /** Human-readable explanation shown for duplicate / invalid rows. */
  reason?: string
}

export interface RosterParseResult {
  rows: ParsedRosterRow[]
  counts: {
    new: number
    duplicate: number
    invalid: number
    /** Blank + template example rows that were silently dropped. */
    skipped: number
  }
}

function toText(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

const HEADER_TOKENS = new Set([
  'studentno',
  'studentid',
  'studentnumber',
  'student',
  'lastname',
  'firstname',
  'middleinitial',
  'middlename',
  'mi',
  'name',
  'last',
  'first',
  'middle',
])

/**
 * A header row carries column labels, not student data. We require at least two
 * cells to match known label tokens (whole-cell, not substring) so a real name
 * that merely contains "first"/"last" is never mistaken for a header.
 */
function looksLikeHeader(cells: string[]): boolean {
  let matches = 0
  for (const cell of cells) {
    const token = cell.toLowerCase().replace(/[^a-z]/g, '')
    if (token && HEADER_TOKENS.has(token)) matches += 1
  }
  return matches >= 2
}

/** The legacy template's italic hint row — every example is prefixed "e.g.". */
function looksLikeNotes(cells: string[]): boolean {
  return cells.some((c) => c.toLowerCase().includes('e.g'))
}

/** Template placeholder rows we skip exactly like the legacy importer. */
function isExampleRow(studentNo: string, lastName: string): boolean {
  return (
    studentNo.toLowerCase().includes('e.g') ||
    lastName.toLowerCase().includes('dela cruz')
  )
}

/**
 * Validate a sheet's array-of-arrays into a preview of roster rows.
 *
 * - The optional header row and the optional "e.g." notes row are detected and
 *   skipped, tolerating both the bare (data-only) and full legacy template.
 * - Blank rows and template example rows are dropped (counted as `skipped`).
 * - A row missing a last or first name is `invalid`.
 * - A student number that already exists in the classroom, or repeats earlier in
 *   the file, is `duplicate` (matches the classroom_id + student_no unique key).
 */
export function parseRosterRows(
  matrix: unknown[][],
  existingStudentNos: Iterable<string> = [],
): RosterParseResult {
  const existing = new Set<string>()
  for (const no of existingStudentNos) {
    const key = toText(no).toLowerCase()
    if (key) existing.add(key)
  }

  const normalized = matrix.map((row) => (row ?? []).map(toText))

  let start = 0
  if (normalized.length > 0 && looksLikeHeader(normalized[0])) start = 1
  if (normalized.length > start && looksLikeNotes(normalized[start])) start += 1

  const rows: ParsedRosterRow[] = []
  const counts = { new: 0, duplicate: 0, invalid: 0, skipped: 0 }
  const seenInFile = new Set<string>()

  for (let i = start; i < normalized.length; i++) {
    const cells = normalized[i]
    const studentNo = cells[0] ?? ''
    const lastName = cells[1] ?? ''
    const firstName = cells[2] ?? ''
    const middleInitial = cells[3] ?? ''
    const rowNumber = i + 1

    // Fully blank row — ignore entirely.
    if (!studentNo && !lastName && !firstName && !middleInitial) {
      continue
    }

    // Template placeholder rows — drop like the legacy importer.
    if (isExampleRow(studentNo, lastName)) {
      counts.skipped += 1
      continue
    }

    const base = { rowNumber, studentNo, lastName, firstName, middleInitial }

    const missing: string[] = []
    if (!lastName) missing.push('last name')
    if (!firstName) missing.push('first name')
    if (missing.length > 0) {
      rows.push({
        ...base,
        status: 'invalid',
        reason: `Missing ${missing.join(' and ')}`,
      })
      counts.invalid += 1
      continue
    }

    const key = studentNo.toLowerCase()
    if (key && existing.has(key)) {
      rows.push({
        ...base,
        status: 'duplicate',
        reason: 'Student number already in this classroom',
      })
      counts.duplicate += 1
      continue
    }
    if (key && seenInFile.has(key)) {
      rows.push({
        ...base,
        status: 'duplicate',
        reason: 'Repeated student number in this file',
      })
      counts.duplicate += 1
      continue
    }

    if (key) seenInFile.add(key)
    rows.push({ ...base, status: 'new' })
    counts.new += 1
  }

  return { rows, counts }
}

/** URL/filename-safe slug of a course code, with a stable fallback. */
export function slugifyCode(code: string | null | undefined): string {
  const slug = (code ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'classroom'
}

export type ExportKind = 'roster-template' | 'grade-sheet' | 'grade-report'

const KIND_SUFFIX: Record<ExportKind, { name: string; ext: string }> = {
  'roster-template': { name: 'roster-template', ext: 'xlsx' },
  'grade-sheet': { name: 'grade-sheet', ext: 'xlsx' },
  'grade-report': { name: 'grade-report', ext: 'pdf' },
}

/** Build a download filename from a course code, e.g. `it-101-grade-sheet.xlsx`. */
export function buildFilename(
  courseCode: string | null | undefined,
  kind: ExportKind,
): string {
  const { name, ext } = KIND_SUFFIX[kind]
  return `${slugifyCode(courseCode)}-${name}.${ext}`
}
