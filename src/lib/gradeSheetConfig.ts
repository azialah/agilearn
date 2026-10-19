/**
 * Shapes, defaults and validation for the per-subject grade sheet settings
 * stored as jsonb in `grade_sheet_configs` and `grade_import_presets`
 * (migration 0039).
 *
 * Pure: no Supabase, no DOM. The database only promises "an object", so every
 * read goes through a `parse*` function here that falls back to defaults for
 * anything missing, unknown or malformed. A config written by an older build
 * therefore keeps working, and a hand-edited row can never crash the grid.
 */

import { z } from 'zod'
import type { Json } from '@/lib/database.types'

/* -------------------------------------------------------------------------- */
/* On-screen grid view                                                        */
/* -------------------------------------------------------------------------- */

export type GridDensity = 'comfortable' | 'compact'

export interface GridViewConfig {
  /** The `%` column after each category's activities. */
  showCategoryPercent: boolean
  /** The "<component> grade" column closing each component in a period. */
  showPeriodGrade: boolean
  /** The per-component columns in the Overall group. */
  showComponentSummary: boolean
  /** The Final column in the Overall group. */
  showFinal: boolean
  /** The student number under each learner's name. */
  showStudentNo: boolean
  /** Components left out of the grid entirely (their grades still count). */
  hiddenComponentIds: string[]
  /** Display order of components; ids not listed keep their structure order. */
  componentOrder: string[]
  density: GridDensity
}

export const DEFAULT_GRID_VIEW: GridViewConfig = {
  showCategoryPercent: true,
  showPeriodGrade: true,
  showComponentSummary: true,
  showFinal: true,
  showStudentNo: true,
  hiddenComponentIds: [],
  componentOrder: [],
  density: 'comfortable',
}

const gridViewSchema = z.object({
  showCategoryPercent: z.boolean().catch(DEFAULT_GRID_VIEW.showCategoryPercent),
  showPeriodGrade: z.boolean().catch(DEFAULT_GRID_VIEW.showPeriodGrade),
  showComponentSummary: z.boolean().catch(DEFAULT_GRID_VIEW.showComponentSummary),
  showFinal: z.boolean().catch(DEFAULT_GRID_VIEW.showFinal),
  showStudentNo: z.boolean().catch(DEFAULT_GRID_VIEW.showStudentNo),
  hiddenComponentIds: z.array(z.string()).catch([]),
  componentOrder: z.array(z.string()).catch([]),
  density: z.enum(['comfortable', 'compact']).catch('comfortable'),
})

export function parseGridView(value: unknown): GridViewConfig {
  const source = isRecord(value) ? value : {}
  return gridViewSchema.parse({ ...DEFAULT_GRID_VIEW, ...source })
}

/**
 * Order `items` by the configured id list, keeping anything unlisted in its
 * original relative order after the listed ones. Ids that no longer exist are
 * simply ignored, so deleting a component never breaks a saved order.
 */
export function orderByIds<T extends { id: string }>(
  items: readonly T[],
  order: readonly string[],
): T[] {
  const rank = new Map(order.map((id, index) => [id, index]))
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const ra = rank.get(a.item.id)
      const rb = rank.get(b.item.id)
      if (ra !== undefined && rb !== undefined) return ra - rb
      if (ra !== undefined) return -1
      if (rb !== undefined) return 1
      return a.index - b.index
    })
    .map(({ item }) => item)
}

/* -------------------------------------------------------------------------- */
/* Export layout                                                              */
/* -------------------------------------------------------------------------- */

/**
 * One configurable column of the grade sheet export. "Group" keys expand into
 * one column per activity / period / component when the sheet is built.
 */
export const EXPORT_COLUMN_KEYS = [
  'rowNumber',
  'studentNo',
  'lastName',
  'firstName',
  'middleInitial',
  'fullName',
  'activities',
  'categoryPercents',
  'periodGrades',
  'periodFinals',
  'periodSheet',
  'componentGrades',
  'finalGrade',
  'remarks',
] as const

export type ExportColumnKey = (typeof EXPORT_COLUMN_KEYS)[number]

export interface ExportColumnMeta {
  key: ExportColumnKey
  /** Shown in the layout editor. */
  title: string
  description: string
  /** Groups expand to many columns, so a single header override makes no sense. */
  group: boolean
  /** Built-in header for single columns (Final is resolved per template). */
  defaultLabel?: string
}

export const EXPORT_COLUMNS: readonly ExportColumnMeta[] = [
  {
    key: 'rowNumber',
    title: 'Row number',
    description: '1, 2, 3… down the class list.',
    group: false,
    defaultLabel: '#',
  },
  {
    key: 'studentNo',
    title: 'Student number',
    description: 'The student no on the roster.',
    group: false,
    defaultLabel: 'Student No.',
  },
  {
    key: 'lastName',
    title: 'Last name',
    description: 'Family name only.',
    group: false,
    defaultLabel: 'Last Name',
  },
  {
    key: 'firstName',
    title: 'First name',
    description: 'Given name only.',
    group: false,
    defaultLabel: 'First Name',
  },
  {
    key: 'middleInitial',
    title: 'Middle initial',
    description: 'A single letter.',
    group: false,
    defaultLabel: 'MI',
  },
  {
    key: 'fullName',
    title: 'Full name',
    description: '"Last, First M." in one column.',
    group: false,
    defaultLabel: 'Name',
  },
  {
    key: 'activities',
    title: 'Activity scores',
    description: 'One column per activity, headed "Period / Category / Activity (max)".',
    group: true,
  },
  {
    key: 'categoryPercents',
    title: 'Category percentages',
    description: 'One column per category in each period.',
    group: true,
  },
  {
    key: 'periodGrades',
    title: 'Period component grades',
    description: 'One column per component in each period.',
    group: true,
  },
  {
    key: 'periodFinals',
    title: 'Period final grades',
    description: 'One column per period, all components combined.',
    group: true,
  },
  {
    key: 'periodSheet',
    title: 'Class record grades',
    description:
      'Per period: "MIDTERM GRADE LEC (40%)", "MIDTERM GRADE LAB (60%)" and "MIDTERM GRADE" (Lec × 40% + Lab × 60%), in whole numbers.',
    group: true,
  },
  {
    key: 'componentGrades',
    title: 'Component grades',
    description: 'One column per component across all periods.',
    group: true,
  },
  {
    key: 'finalGrade',
    title: 'Final grade',
    description: 'The reported final (percentage, transmuted or 1.00–5.00).',
    group: false,
  },
  {
    key: 'remarks',
    title: 'Remarks',
    description: 'PASSED, FAILED or INCOMPLETE.',
    group: false,
    defaultLabel: 'Remarks',
  },
]

export function exportColumnMeta(key: ExportColumnKey): ExportColumnMeta {
  const meta = EXPORT_COLUMNS.find((column) => column.key === key)
  if (!meta) throw new Error(`Unknown export column: ${key}`)
  return meta
}

export interface ExportColumnSetting {
  key: ExportColumnKey
  enabled: boolean
  /** Header override for single columns; blank means the built-in header. */
  label: string
}

export interface ExportLayout {
  sheetName: string
  columns: ExportColumnSetting[]
}

/**
 * The class-record format schools hand in:
 *
 *   # | Name | Student No | MIDTERM GRADE LEC (40%) | MIDTERM GRADE LAB (60%) | MIDTERM GRADE | …
 *
 * Every other column stays available, disabled, in the layout editor.
 */
const DEFAULT_ENABLED_ORDER: readonly ExportColumnKey[] = [
  'rowNumber',
  'fullName',
  'studentNo',
  'periodSheet',
]

export const DEFAULT_SHEET_NAME = 'Grade Sheet'

export const DEFAULT_EXPORT_LAYOUT: ExportLayout = {
  sheetName: DEFAULT_SHEET_NAME,
  columns: [
    ...DEFAULT_ENABLED_ORDER.map((key) => ({ key, enabled: true, label: '' })),
    ...EXPORT_COLUMN_KEYS.filter((key) => !DEFAULT_ENABLED_ORDER.includes(key)).map(
      (key) => ({ key, enabled: false, label: '' }),
    ),
  ],
}

/** The full computed sheet the export produced before the class-record format
 *  became the default — activity scores, period and component grades, final. */
export const DETAILED_EXPORT_LAYOUT: ExportLayout = {
  sheetName: DEFAULT_SHEET_NAME,
  columns: EXPORT_COLUMN_KEYS.map((key) => ({
    key,
    enabled: (
      [
        'studentNo',
        'lastName',
        'firstName',
        'middleInitial',
        'activities',
        'periodGrades',
        'componentGrades',
        'finalGrade',
        'remarks',
      ] as const
    ).some((enabled) => enabled === key),
    label: '',
  })),
}

const exportColumnSchema = z.object({
  key: z.enum(EXPORT_COLUMN_KEYS),
  enabled: z.boolean().catch(true),
  label: z.string().max(80).catch(''),
})

/** Excel rejects sheet names over 31 chars or containing any of : \ / ? * [ ] */
export function sanitizeSheetName(name: string): string {
  const cleaned = name
    .replace(/[:\\/?*[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 31)
    .trim()
  return cleaned || DEFAULT_SHEET_NAME
}

/**
 * Read a stored layout. Unknown keys and duplicates are dropped; any column the
 * stored layout does not mention (e.g. one added in a later release) is
 * appended disabled, so the editor always lists every column exactly once.
 */
export function parseExportLayout(value: unknown): ExportLayout {
  const source = isRecord(value) ? value : {}
  const sheetName =
    typeof source.sheetName === 'string'
      ? sanitizeSheetName(source.sheetName)
      : DEFAULT_SHEET_NAME
  const rawColumns = Array.isArray(source.columns) ? source.columns : null
  if (!rawColumns) return { ...DEFAULT_EXPORT_LAYOUT, sheetName }

  const seen = new Set<ExportColumnKey>()
  const columns: ExportColumnSetting[] = []
  for (const raw of rawColumns) {
    const parsed = exportColumnSchema.safeParse(raw)
    if (!parsed.success || seen.has(parsed.data.key)) continue
    seen.add(parsed.data.key)
    columns.push({ ...parsed.data, label: parsed.data.label.trim() })
  }
  for (const key of EXPORT_COLUMN_KEYS) {
    if (!seen.has(key)) columns.push({ key, enabled: false, label: '' })
  }
  return { sheetName, columns }
}

/* -------------------------------------------------------------------------- */
/* Import presets                                                             */
/* -------------------------------------------------------------------------- */

export type RosterRole =
  'studentNo' | 'fullName' | 'lastName' | 'firstName' | 'middleName'

export interface ActivityTarget {
  /**
   * Grading period name; matched loosely ("Q1" = "Quarter 1"), created if
   * missing. Blank inherits the sheet's period, so changing a sheet's period
   * moves all of its columns with it.
   */
  period: string
  /** Category name; matched loosely, created if missing. */
  category: string
  /** Activity name; matched case-insensitively within period + category. */
  name: string
  maxScore: number
}

export type ColumnMapping =
  { role: 'ignore' } | { role: RosterRole } | ({ role: 'activity' } & ActivityTarget)

export interface SheetMapping {
  include: boolean
  /** Default period for this sheet's activity columns. */
  period: string
  /** Keyed by {@link DetectedColumn.key} from the class-record parser. */
  columns: Record<string, ColumnMapping>
}

export interface ImportPresetMapping {
  version: 1
  /** Keyed by normalized sheet name. */
  sheets: Record<string, SheetMapping>
}

const columnMappingSchema: z.ZodType<ColumnMapping> = z.union([
  z.object({ role: z.literal('ignore') }),
  z.object({
    role: z.enum(['studentNo', 'fullName', 'lastName', 'firstName', 'middleName']),
  }),
  z.object({
    role: z.literal('activity'),
    period: z.string(),
    category: z.string().min(1),
    name: z.string().min(1),
    maxScore: z.number().positive(),
  }),
])

const sheetMappingSchema = z.object({
  include: z.boolean().catch(true),
  period: z.string().catch(''),
  columns: z.record(z.string(), z.unknown()).catch({}),
})

/** Returns null when the stored mapping is unusable, so callers can skip it. */
export function parseImportPresetMapping(value: unknown): ImportPresetMapping | null {
  if (!isRecord(value) || !isRecord(value.sheets)) return null
  const sheets: Record<string, SheetMapping> = {}
  for (const [sheetKey, rawSheet] of Object.entries(value.sheets)) {
    const sheet = sheetMappingSchema.safeParse(rawSheet)
    if (!sheet.success) continue
    const columns: Record<string, ColumnMapping> = {}
    for (const [columnKey, rawColumn] of Object.entries(sheet.data.columns)) {
      const column = columnMappingSchema.safeParse(rawColumn)
      if (column.success) columns[columnKey] = column.data
    }
    sheets[sheetKey] = { include: sheet.data.include, period: sheet.data.period, columns }
  }
  return Object.keys(sheets).length > 0 ? { version: 1, sheets } : null
}

/** Plain-object copy typed for the jsonb column. */
export function presetMappingToJson(mapping: ImportPresetMapping): Json {
  const sheets: { [key: string]: Json } = {}
  for (const [sheetKey, sheet] of Object.entries(mapping.sheets)) {
    const columns: { [key: string]: Json } = {}
    for (const [columnKey, column] of Object.entries(sheet.columns)) {
      columns[columnKey] =
        column.role === 'activity'
          ? {
              role: column.role,
              period: column.period,
              category: column.category,
              name: column.name,
              maxScore: column.maxScore,
            }
          : { role: column.role }
    }
    sheets[sheetKey] = { include: sheet.include, period: sheet.period, columns }
  }
  return { version: mapping.version, sheets }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
