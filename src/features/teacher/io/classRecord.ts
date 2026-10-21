/**
 * Layout detection for custom class-record workbooks.
 *
 * Pure: operates on the array-of-arrays the readers in readSheet.ts produce, so
 * every heuristic here is unit-testable without SheetJS or the DOM.
 *
 * What it understands
 * -------------------
 * - A header row naming the learner column ("Learner's Names", "Student Name",
 *   "Last Name" + "First Name", …), optionally with a student number / LRN.
 * - Header bands above or below that row: "WRITTEN WORKS (30%)" over columns
 *   "1 … 10", so each activity column learns its category and weight hint.
 * - A "Highest Possible Score" row holding each activity's max score, or a max
 *   written into the header itself: "Quiz 1 (20)", "Quiz 1 /20", "20 pts".
 * - Agilearn's own export: "Quarter 1 / Written work / Quiz 1 (20)".
 * - One sheet per grading period, named "Q1", "1st Quarter", "Midterm", …
 * - Section marker rows (MALE / FEMALE) and signature footers, which are skipped.
 *
 * What it refuses to do: trust computed columns. Totals, PS/WS, initial and
 * quarterly grades are recognised and suggested as "ignore" — Agilearn
 * recomputes every grade in src/lib/grading.ts from the raw scores.
 *
 * Detection only *suggests* a {@link ColumnMapping} per column. The import
 * wizard lets the teacher override any of it, and classRecordPlan.ts turns the
 * final mapping into concrete writes.
 */

import type {
  ActivityTarget,
  ColumnMapping,
  RosterRole,
  SheetMapping,
} from '@/lib/gradeSheetConfig'

export interface SheetMatrix {
  name: string
  rows: unknown[][]
}

export interface DetectedColumn {
  /** 0-based column index in the sheet. */
  index: number
  /** Stable mapping key: normalized header chain + occurrence. */
  key: string
  /** Display label, header bands joined top to bottom. */
  header: string
  /** Spreadsheet column letter, for the wizard ("D"). */
  letter: string
  /** A few non-blank data values, for the wizard. */
  sample: string[]
  /** Highest Possible Score row value, when the sheet has one. */
  hpsMax: number | null
  /** Category weight read from a header band like "(30%)", as a decimal. */
  categoryWeight: number | null
  suggested: ColumnMapping
  /** Why the suggestion is what it is; shown next to the column. */
  note?: string
  /** True when the max score was guessed from the highest value seen. */
  maxInferred?: boolean
}

export interface DataRow {
  /** 1-based row number as the teacher sees it in Excel. */
  rowNumber: number
  cells: string[]
}

export interface DetectedSheet {
  name: string
  /** Normalized sheet name, the key a preset stores. */
  key: string
  /** Period suggested by the sheet name, or the caller's default. */
  period: string
  columns: DetectedColumn[]
  rows: DataRow[]
  /** Whether the wizard should include this sheet by default. */
  include: boolean
  /** Why a sheet is excluded or empty. */
  reason?: string
  /** 1-based row of the learner header, for display. */
  headerRowNumber: number | null
}

export interface DetectOptions {
  /** Used when a sheet's name carries no period, e.g. a single "Sheet1". */
  defaultPeriod?: string
}

/* -------------------------------------------------------------------------- */
/* Text helpers                                                               */
/* -------------------------------------------------------------------------- */

export function toText(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value).replace(/\s+/g, ' ').trim()
}

/** Lowercase letters and digits only: "LEARNERS' NAMES" -> "learnersnames". */
export function token(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function columnLetter(index: number): string {
  let n = index + 1
  let letters = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    letters = String.fromCharCode(65 + rem) + letters
    n = Math.floor((n - 1) / 26)
  }
  return letters
}

/** "WRITTEN WORKS" -> "Written Works"; mixed-case input is left alone. */
export function tidyLabel(value: string): string {
  const trimmed = value.replace(/[:\-–—]+$/, '').trim()
  if (trimmed !== trimmed.toUpperCase() || !/[A-Z]/.test(trimmed)) return trimmed
  return trimmed.toLowerCase().replace(/(^|[\s(/-])([a-z])/g, (_m, lead, ch) => {
    return `${lead}${ch.toUpperCase()}`
  })
}

/** Cells that mean "no score" rather than an invalid one. */
const BLANK_SCORE = new Set(['', '-', '–', '—', 'x', 'na', 'n/a', 'ab', 'abs', 'absent'])

export function isBlankScore(value: string): boolean {
  return BLANK_SCORE.has(value.trim().toLowerCase())
}

/** "18", "18.5", "1,000" -> number; anything else -> null. */
export function parseNumber(value: string): number | null {
  const cleaned = value.trim().replace(/,(?=\d{3}\b)/g, '')
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

/* -------------------------------------------------------------------------- */
/* Header vocabulary                                                          */
/* -------------------------------------------------------------------------- */

const ROSTER_TOKENS: Record<RosterRole, readonly string[]> = {
  studentNo: [
    'studentno',
    'studentnumber',
    'studentid',
    'studentidno',
    'idno',
    'idnumber',
    'lrn',
    'learnerreferencenumber',
    'learnerreferenceno',
  ],
  fullName: [
    'learnersnames',
    'learnersname',
    'learnername',
    'learnernames',
    'nameoflearner',
    'nameoflearners',
    'studentname',
    'studentsname',
    'studentnames',
    'nameofstudent',
    'nameofstudents',
    'fullname',
    'name',
    'names',
    'student',
    'learner',
  ],
  lastName: ['lastname', 'surname', 'familyname', 'last'],
  firstName: ['firstname', 'givenname', 'first'],
  middleName: ['middlename', 'middleinitial', 'mi', 'middle'],
}

const ROSTER_ORDER: readonly RosterRole[] = [
  'studentNo',
  'lastName',
  'firstName',
  'middleName',
  'fullName',
]

function rosterRoleOf(cell: string): RosterRole | null {
  const t = token(cell)
  if (!t) return null
  for (const role of ROSTER_ORDER) {
    if (ROSTER_TOKENS[role].includes(t)) return role
  }
  return null
}

/** A cell that names a learner column — the anchor of the header block. */
function isNameHeader(cell: string): boolean {
  const role = rosterRoleOf(cell)
  return role === 'fullName' || role === 'lastName'
}

/** Row-number columns: "#", "No.", "Seq". */
function isSequenceHeader(cell: string): boolean {
  return cell.trim() === '#' || ['no', 'seq', 'count', 'sn'].includes(token(cell))
}

// Anchored so a learner called "Max" is never read as the max-score row.
const HPS_PATTERN =
  /highest\s*possible|^\s*hps\s*:?\s*$|^\s*max(imum)?(\s*(score|points?))?\s*:?\s*$|perfect\s*score|total\s*(no\.?\s*of\s*)?items|^\s*(no\.?\s*of\s*)?items\s*:?\s*$/i

/** Bands and columns whose numbers are derived, never typed in by hand. */
const COMPUTED_TOKENS = new Set([
  'total',
  'totals',
  'ps',
  'ws',
  'percentagescore',
  'weightedscore',
  'initialgrade',
  'quarterlygrade',
  'transmutedgrade',
  'finalgrade',
  'final',
  'grade',
  'grades',
  'average',
  'ave',
  'avg',
  'mean',
  'remarks',
  'remark',
  'rank',
  'equivalent',
  'gradeequivalent',
  'descriptor',
  'percent',
  'percentage',
  'rating',
  'finalrating',
  'tab',
  'tabscore',
  'weighted',
])

function looksComputed(segment: string): boolean {
  const t = token(segment)
  if (!t) return false
  if (COMPUTED_TOKENS.has(t)) return true
  return (
    /(grade|rating|average|total|remarks?|equivalent)$/.test(t) ||
    // Agilearn's own class-record sheet: "MIDTERM GRADE LEC (40%)" holds a
    // finished period grade, not an activity score.
    /grade(lec|lecture|lab|laboratory)\d*$/.test(t) ||
    /^(total|tabscore|tab$|weighted)/.test(t) ||
    // "Quarterly Grade" is computed; "Quarterly Assessment" is an exam.
    /^(weighted|percentage|initial|quarterly|transmuted)(grade|score|rating)/.test(t) ||
    segment.trim().endsWith('%')
  )
}

/** Markers between learners: "MALE", "FEMALE", "BOYS", footers. */
const MARKER_PATTERN =
  /^(male|female|boys|girls|m|f|total|totals|average|mean|highest|lowest|summary|prepared\s*by.*|checked\s*by.*|noted\s*by.*|submitted\s*by.*|approved\s*by.*|attested\s*by.*)$/i

/* -------------------------------------------------------------------------- */
/* Max score + naming                                                         */
/* -------------------------------------------------------------------------- */

/** Agilearn's own grade-sheet export header. */
const EXPORT_ACTIVITY = /^(.+?) \/ (.+?) \/ (.+) \((\d+(?:\.\d+)?)\)$/

/** "Quiz 1 (20)", "Quiz 1 /20", "Quiz 1 - 20 pts", "Quiz 1 [20 items]". */
export function maxFromHeader(header: string): { name: string; max: number } | null {
  const patterns: RegExp[] = [
    /^(.*?)[\s-]*[([]\s*(\d+(?:\.\d+)?)\s*(?:pts?|points?|items?)?\s*[)\]]\s*$/i,
    /^(.*?)\s*\/\s*(\d+(?:\.\d+)?)\s*$/,
    /^(.*?)[\s-]+(\d+(?:\.\d+)?)\s*(?:pts?|points?|items?)\s*$/i,
  ]
  for (const pattern of patterns) {
    const match = header.match(pattern)
    if (!match) continue
    const max = Number(match[2])
    const name = match[1].trim()
    if (max > 0 && name) return { name, max }
  }
  return null
}

/** "(30%)" / "30%" inside a band label, as a decimal weight. */
export function weightFromLabel(label: string): number | null {
  const match = label.match(/(\d+(?:\.\d+)?)\s*%/)
  if (!match) return null
  const weight = Number(match[1]) / 100
  return weight > 0 && weight <= 1 ? weight : null
}

function stripWeight(label: string): string {
  return label
    .replace(/[([]?\s*\d+(?:\.\d+)?\s*%\s*[)\]]?/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** A best-guess category for a column that sits under no header band. */
export function guessCategory(activityName: string): string {
  const t = activityName.toLowerCase()
  if (/\bquiz/.test(t)) return 'Quizzes'
  if (/\b(exam|test|assessment)/.test(t)) return 'Exams'
  if (/\bproject/.test(t)) return 'Projects'
  if (/\b(assignment|homework|hw)\b/.test(t)) return 'Assignments'
  if (/\b(lab|laboratory|experiment)/.test(t)) return 'Laboratory'
  if (/\brecit/.test(t)) return 'Recitation'
  if (/\b(seatwork|sw)\b/.test(t)) return 'Seatwork'
  if (/\b(performance|pt)\b/.test(t)) return 'Performance Tasks'
  if (/\b(written|ww)\b/.test(t)) return 'Written Works'
  return 'Activities'
}

/** Period named by a sheet: "Q1", "1st Quarter", "MIDTERM", "Finals". */
export function periodFromSheetName(name: string): string | null {
  const t = name.toLowerCase()
  const quarter =
    t.match(/\b(?:q|qtr|quarter)\s*-?\s*([1-4])\b/) ??
    t.match(/\b([1-4])\s*(?:st|nd|rd|th)?\s*(?:q|qtr|quarter)\b/)
  if (quarter) return `Quarter ${quarter[1]}`
  const word = t.match(/\b(first|second|third|fourth)\s*(?:q|qtr|quarter)\b/)
  if (word) {
    const n = ['first', 'second', 'third', 'fourth'].indexOf(word[1]) + 1
    return `Quarter ${n}`
  }
  if (/\bprelim/.test(t)) return 'Prelim'
  if (/\bmid[\s-]?term/.test(t)) return 'Midterm'
  if (/\bsemi[\s-]?finals?\b/.test(t)) return 'Semi-final'
  if (/\bfinals?\b/.test(t) && !/grade/.test(t)) return 'Finals'
  if (/\b(1st|first)\s*sem/.test(t)) return 'First semester'
  if (/\b(2nd|second)\s*sem/.test(t)) return 'Second semester'
  return null
}

/* -------------------------------------------------------------------------- */
/* Detection                                                                  */
/* -------------------------------------------------------------------------- */

const HEADER_SCAN_ROWS = 40

function findHeaderRow(rows: string[][]): number {
  for (let r = 0; r < Math.min(HEADER_SCAN_ROWS, rows.length); r++) {
    if (rows[r].some(isNameHeader)) return r
  }
  return -1
}

interface RosterColumns {
  roles: Map<number, RosterRole>
  nameColumns: number[]
}

/** First column per role wins; a merged name header repeats, so later copies are dropped. */
function rosterColumns(header: string[]): RosterColumns {
  const roles = new Map<number, RosterRole>()
  const taken = new Set<RosterRole>()
  header.forEach((cell, index) => {
    const role = rosterRoleOf(cell)
    if (!role || taken.has(role)) return
    taken.add(role)
    roles.set(index, role)
  })
  // "Last name" + "First name" beats a stray "Name" band elsewhere.
  if (taken.has('lastName') && taken.has('firstName')) {
    for (const [index, role] of roles) if (role === 'fullName') roles.delete(index)
  }
  const nameColumns = [...roles]
    .filter(([, role]) => role !== 'middleName')
    .map(([index]) => index)
  return { roles, nameColumns }
}

function rowLabel(row: string[], nameColumns: number[]): string {
  // The label of a marker / HPS row sits in the name column, or in the first
  // filled cell when the sheet puts it elsewhere.
  for (const index of nameColumns) if (row[index]) return row[index]
  return row.find((cell) => cell !== '') ?? ''
}

function isLearnerRow(row: string[], roster: RosterColumns): boolean {
  const values = roster.nameColumns.map((index) => row[index] ?? '').filter(Boolean)
  if (values.length === 0) return false
  const label = values.join(' ')
  if (MARKER_PATTERN.test(label.trim()) || HPS_PATTERN.test(label)) return false
  // A vertically merged "LEARNERS' NAMES" header is copied into the rows under
  // it by the merge fill; those are still header, not learners.
  if (values.some((value) => rosterRoleOf(value) !== null)) return false
  // A learner has letters in a name, or a student number.
  return values.some((value) => /[a-z]/i.test(value)) || values.some((v) => /\d/.test(v))
}

export function detectClassRecord(
  sheets: readonly SheetMatrix[],
  options: DetectOptions = {},
): DetectedSheet[] {
  return sheets.map((sheet) => detectSheet(sheet, options))
}

function detectSheet(sheet: SheetMatrix, options: DetectOptions): DetectedSheet {
  const rows = sheet.rows.map((row) => (row ?? []).map(toText))
  const width = rows.reduce((max, row) => Math.max(max, row.length), 0)
  const period = periodFromSheetName(sheet.name) ?? options.defaultPeriod ?? sheet.name
  const base: DetectedSheet = {
    name: sheet.name,
    key: sheetKey(sheet.name),
    period,
    columns: [],
    rows: [],
    include: false,
    headerRowNumber: null,
  }

  const headerRow = findHeaderRow(rows)
  if (headerRow < 0) return { ...base, reason: 'No learner name column found' }

  const roster = rosterColumns(rows[headerRow])
  if (roster.nameColumns.length === 0) {
    return { ...base, reason: 'No learner name column found' }
  }

  // Everything between the learner header and the first learner is header
  // material: sub-header bands, the HPS row, MALE/FEMALE markers.
  let firstData = -1
  for (let r = headerRow + 1; r < rows.length; r++) {
    if (isLearnerRow(rows[r], roster)) {
      firstData = r
      break
    }
  }
  if (firstData < 0) {
    return {
      ...base,
      headerRowNumber: headerRow + 1,
      reason: 'No learner rows below the header',
    }
  }

  let hpsRow = -1
  const bandRows: number[] = []
  // Bands above the learner header only count when they carry a weight, which
  // keeps "SCHOOL NAME: …" style banners out of every column's label.
  for (let r = Math.max(0, headerRow - 2); r < headerRow; r++) {
    if (rows[r].some((cell) => weightFromLabel(cell) !== null)) bandRows.push(r)
  }
  bandRows.push(headerRow)
  for (let r = headerRow + 1; r < firstData; r++) {
    const label = rowLabel(rows[r], roster.nameColumns)
    if (HPS_PATTERN.test(label) || rows[r].some((cell) => HPS_PATTERN.test(cell))) {
      hpsRow = r
    } else if (!MARKER_PATTERN.test(label.trim()) && rows[r].some(Boolean)) {
      bandRows.push(r)
    }
  }
  // Some records leave the max-score row unlabelled: a row between the header
  // and the first learner that is mostly numbers, with an empty name cell.
  if (hpsRow < 0) {
    for (let r = headerRow + 1; r < firstData; r++) {
      const row = rows[r]
      if (roster.nameColumns.some((index) => row[index])) continue
      const filled = row.filter(Boolean)
      if (filled.length >= 2 && filled.every((cell) => parseNumber(cell) !== null)) {
        hpsRow = r
        const index = bandRows.indexOf(r)
        if (index >= 0) bandRows.splice(index, 1)
      }
    }
  }
  // The HPS row can also sit right under the first marker, below "MALE".
  if (hpsRow < 0) {
    for (let r = firstData; r < Math.min(rows.length, firstData + 3); r++) {
      if (HPS_PATTERN.test(rowLabel(rows[r], roster.nameColumns))) hpsRow = r
    }
  }

  const dataRows: DataRow[] = []
  for (let r = firstData; r < rows.length; r++) {
    if (r === hpsRow) continue
    if (!isLearnerRow(rows[r], roster)) continue
    dataRows.push({ rowNumber: r + 1, cells: rows[r] })
  }

  const exportFormat = rows[headerRow].some((cell) => EXPORT_ACTIVITY.test(cell))
  const keyCounts = new Map<string, number>()
  const columns: DetectedColumn[] = []

  for (let c = 0; c < width; c++) {
    const chain: string[] = []
    for (const r of bandRows) {
      const cell = rows[r][c] ?? ''
      if (cell && chain[chain.length - 1] !== cell) chain.push(cell)
    }
    const values = dataRows.map((row) => row.cells[c] ?? '')
    const filled = values.filter((value) => !isBlankScore(value))
    if (chain.length === 0 && filled.length === 0) continue

    const header = chain.join(' › ')
    const baseKey = token(chain.join('|')) || `col${c}`
    const occurrence = keyCounts.get(baseKey) ?? 0
    keyCounts.set(baseKey, occurrence + 1)
    const key = occurrence === 0 ? baseKey : `${baseKey}~${occurrence}`

    const hpsValue = hpsRow >= 0 ? parseNumber(rows[hpsRow][c] ?? '') : null
    // The nearest band above the activity is its category; outer bands like
    // "CLASS STANDING (70%)" only group categories.
    const categoryWeight =
      chain.length > 1 ? weightFromLabel(chain[chain.length - 2]) : null

    const column: DetectedColumn = {
      index: c,
      key,
      header: header || `(untitled ${columnLetter(c)})`,
      letter: columnLetter(c),
      sample: filled.slice(0, 4),
      hpsMax: hpsValue !== null && hpsValue > 0 ? hpsValue : null,
      categoryWeight,
      suggested: { role: 'ignore' },
    }

    const role = roster.roles.get(c)
    if (role) {
      column.suggested = { role }
    } else if (isSequenceHeader(chain[chain.length - 1] ?? '')) {
      column.note = 'Row numbers'
    } else {
      suggestActivity(column, chain, filled, exportFormat)
    }
    columns.push(column)
  }

  const activityCount = columns.filter((col) => col.suggested.role === 'activity').length
  const hasStudentNo = columns.some((col) => col.suggested.role === 'studentNo')
  return {
    ...base,
    columns,
    rows: dataRows,
    headerRowNumber: headerRow + 1,
    include: activityCount > 0 || hasStudentNo,
    reason:
      activityCount > 0 || hasStudentNo ? undefined : 'Only computed or text columns',
  }
}

function suggestActivity(
  column: DetectedColumn,
  chain: string[],
  filled: string[],
  exportFormat: boolean,
): void {
  const last = chain[chain.length - 1] ?? ''

  if (exportFormat) {
    const match = last.match(EXPORT_ACTIVITY)
    if (match) {
      column.suggested = {
        role: 'activity',
        period: match[1].trim(),
        category: match[2].trim(),
        name: match[3].trim(),
        maxScore: Number(match[4]),
      }
      return
    }
    // In our own export every other numeric column is a computed grade.
    column.note = 'Computed by the export — recalculated here'
    return
  }

  if (chain.some(looksComputed)) {
    column.note = 'Computed column — Agilearn recalculates grades'
    return
  }

  const numbers = filled.map(parseNumber)
  const textValues = filled.filter((_value, index) => numbers[index] === null)
  if (textValues.length > 0) {
    column.note = 'Contains text, not scores'
    return
  }
  const scores = numbers.filter((n): n is number => n !== null)

  const fromHeader = maxFromHeader(last)
  const rawName = fromHeader?.name ?? last
  const band = chain.length > 1 ? chain[chain.length - 2] : ''
  const category = band ? tidyLabel(stripWeight(band)) || 'Activities' : null
  // Bare "1", "2" under a band become "Written Works 1".
  const name =
    category && /^#?\s*\d+$/.test(rawName.trim())
      ? `${category} ${rawName.replace(/\D/g, '')}`
      : tidyLabel(stripWeight(rawName)) || `Column ${column.letter}`

  let max = column.hpsMax ?? fromHeader?.max ?? null
  if (max === null) {
    if (scores.length === 0) {
      column.note = 'No scores and no max score'
      return
    }
    if (scores.some((n) => !Number.isInteger(n))) {
      column.note = 'Decimals without a max score — looks computed'
      return
    }
    max = Math.max(...scores)
    if (max <= 0) {
      column.note = 'No positive scores'
      return
    }
    column.maxInferred = true
    column.note = 'Max score guessed from the highest value — confirm it'
  } else if (scores.length === 0) {
    column.note = 'No scores entered yet'
    return
  }

  column.suggested = {
    role: 'activity',
    period: '',
    category: category ?? guessCategory(name),
    name,
    maxScore: max,
  }
}

/**
 * A starting activity target for a column the teacher switches to "activity"
 * by hand (one the detector left as ignore). Their suggestion wins when there
 * is one; otherwise the header and samples give a best guess to edit.
 */
export function defaultActivityTarget(column: DetectedColumn): ActivityTarget {
  if (column.suggested.role === 'activity') {
    const { role: _role, ...target } = column.suggested
    return target
  }
  const chain = column.header.split(' › ')
  const last = chain[chain.length - 1] ?? ''
  const fromHeader = maxFromHeader(last)
  const band = chain.length > 1 ? tidyLabel(stripWeight(chain[chain.length - 2])) : ''
  const name =
    tidyLabel(stripWeight(fromHeader?.name ?? last)) || `Column ${column.letter}`
  const highest = Math.max(
    0,
    ...column.sample.map(parseNumber).filter((n): n is number => n !== null),
  )
  return {
    period: '',
    category: band || guessCategory(name),
    name,
    maxScore: column.hpsMax ?? fromHeader?.max ?? (highest > 0 ? highest : 100),
  }
}

export function sheetKey(name: string): string {
  return token(name) || 'sheet'
}

/** The wizard's starting mapping: every detector suggestion, as-is. */
export function suggestedMapping(sheet: DetectedSheet): SheetMapping {
  const columns: Record<string, ColumnMapping> = {}
  for (const column of sheet.columns) columns[column.key] = column.suggested
  return { include: sheet.include, period: sheet.period, columns }
}

/* -------------------------------------------------------------------------- */
/* Names                                                                      */
/* -------------------------------------------------------------------------- */

export interface NameParts {
  lastName: string
  firstName: string
  middleInitial: string
}

/**
 * "DELA CRUZ, JUAN A." / "Dela Cruz, Juan Andres" / "Juan A. Dela Cruz".
 * Class records overwhelmingly write last-name-first with a comma; without a
 * comma the last word is taken as the surname.
 */
export function splitFullName(value: string): NameParts {
  const text = value.replace(/\s+/g, ' ').trim()
  if (!text) return { lastName: '', firstName: '', middleInitial: '' }
  if (text.includes(',')) {
    const [last, ...rest] = text.split(',')
    const given = rest.join(' ').replace(/\s+/g, ' ').trim()
    const { first, middle } = splitGiven(given)
    return { lastName: last.trim(), firstName: first, middleInitial: middle }
  }
  const words = text.split(' ')
  if (words.length === 1) return { lastName: words[0], firstName: '', middleInitial: '' }
  const lastName = words.pop() ?? ''
  const { first, middle } = splitGiven(words.join(' '))
  return { lastName, firstName: first, middleInitial: middle }
}

function splitGiven(given: string): { first: string; middle: string } {
  const words = given.split(' ').filter(Boolean)
  if (words.length >= 2) {
    const tail = words[words.length - 1]
    // A trailing initial: "A." or "A". Suffixes like "Jr." stay in the name.
    if (/^[a-z]\.?$/i.test(tail)) {
      return { first: words.slice(0, -1).join(' '), middle: tail.charAt(0).toUpperCase() }
    }
  }
  return { first: words.join(' '), middle: '' }
}
