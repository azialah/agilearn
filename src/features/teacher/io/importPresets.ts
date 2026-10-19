/**
 * Saved import mappings: apply one to a freshly detected workbook, score how
 * well it fits, and capture the wizard's current mapping as a new preset.
 *
 * Pure. Column keys come from the class-record detector (normalized header
 * chains), so a preset keeps working when the next file has more learners or
 * an extra blank row — only a renamed header stops a column from matching.
 */

import type {
  ColumnMapping,
  ImportPresetMapping,
  SheetMapping,
} from '@/lib/gradeSheetConfig'
import { suggestedMapping, type DetectedSheet } from './classRecord'

/** Minimum share of a file's columns a preset must recognise to auto-apply. */
export const AUTO_APPLY_THRESHOLD = 0.6

function overlap(sheet: DetectedSheet, preset: SheetMapping): number {
  if (sheet.columns.length === 0) return 0
  const hits = sheet.columns.filter((column) => column.key in preset.columns).length
  return hits / sheet.columns.length
}

/**
 * The preset sheet to use for `sheet`: the one with the same name, else the
 * one whose columns overlap most — "Q2" reuses the "Q1" mapping when a file
 * has a quarter the preset never saw.
 */
function presetSheetFor(
  sheet: DetectedSheet,
  preset: ImportPresetMapping,
): { mapping: SheetMapping; sameName: boolean } | null {
  const exact = preset.sheets[sheet.key]
  if (exact) return { mapping: exact, sameName: true }
  let best: SheetMapping | null = null
  let bestScore = 0
  for (const candidate of Object.values(preset.sheets)) {
    const score = overlap(sheet, candidate)
    if (score > bestScore) {
      best = candidate
      bestScore = score
    }
  }
  return best && bestScore >= AUTO_APPLY_THRESHOLD
    ? { mapping: best, sameName: false }
    : null
}

/** Share of the workbook's columns (across all sheets) the preset recognises. */
export function presetFit(
  sheets: readonly DetectedSheet[],
  preset: ImportPresetMapping,
): number {
  let total = 0
  let hits = 0
  for (const sheet of sheets) {
    if (sheet.columns.length === 0) continue
    total += sheet.columns.length
    const match = presetSheetFor(sheet, preset)
    if (match) hits += sheet.columns.filter((c) => c.key in match.mapping.columns).length
  }
  return total === 0 ? 0 : hits / total
}

/** Best-fitting preset at or above the threshold, if any. */
export function bestPreset<T extends { mapping: ImportPresetMapping }>(
  sheets: readonly DetectedSheet[],
  presets: readonly T[],
): T | null {
  let best: T | null = null
  let bestFit = AUTO_APPLY_THRESHOLD
  for (const preset of presets) {
    const fit = presetFit(sheets, preset.mapping)
    if (fit >= bestFit) {
      best = preset
      bestFit = fit
    }
  }
  return best
}

/**
 * Mappings for every detected sheet with the preset laid over the detector's
 * suggestions. Columns the preset does not know keep their suggestion.
 */
export function applyPreset(
  sheets: readonly DetectedSheet[],
  preset: ImportPresetMapping,
): Record<string, SheetMapping> {
  const result: Record<string, SheetMapping> = {}
  for (const sheet of sheets) {
    const suggested = suggestedMapping(sheet)
    const match = presetSheetFor(sheet, preset)
    if (!match) {
      result[sheet.key] = suggested
      continue
    }
    // Borrowed from a differently named sheet: its activities belong to that
    // sheet's period, so re-home them onto this sheet's own period.
    const period = match.sameName ? match.mapping.period || sheet.period : sheet.period
    const columns: Record<string, ColumnMapping> = { ...suggested.columns }
    for (const column of sheet.columns) {
      const saved = match.mapping.columns[column.key]
      if (!saved) continue
      columns[column.key] =
        saved.role === 'activity' &&
        !match.sameName &&
        saved.period === match.mapping.period
          ? { ...saved, period }
          : saved
    }
    result[sheet.key] = { include: match.mapping.include, period, columns }
  }
  return result
}

/** Capture the wizard's mapping as a preset payload. */
export function presetFromMappings(
  sheets: readonly DetectedSheet[],
  mappings: Readonly<Record<string, SheetMapping>>,
): ImportPresetMapping {
  const result: ImportPresetMapping = { version: 1, sheets: {} }
  for (const sheet of sheets) {
    const mapping = mappings[sheet.key]
    if (!mapping) continue
    const columns: Record<string, ColumnMapping> = {}
    for (const column of sheet.columns) {
      const saved = mapping.columns[column.key]
      if (saved) columns[column.key] = saved
    }
    result.sheets[sheet.key] = {
      include: mapping.include,
      period: mapping.period,
      columns,
    }
  }
  return result
}
