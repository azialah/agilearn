/** Read uploaded workbooks into plain array-of-arrays for the pure parsers. */

import * as XLSX from 'xlsx'
import type { SheetMatrix } from './classRecord'

function toMatrix(ws: XLSX.WorkSheet): unknown[][] {
  return XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    raw: false,
    defval: '',
    blankrows: true,
  })
}

/** Read the first worksheet of an uploaded file into a plain array-of-arrays. */
export async function readSheetMatrix(file: File): Promise<unknown[][]> {
  const data = await file.arrayBuffer()
  const wb = XLSX.read(data, { type: 'array' })
  const sheetName = wb.SheetNames[0]
  if (!sheetName) return []
  const ws = wb.Sheets[sheetName]
  return XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    raw: false,
    defval: '',
    blankrows: false,
  })
}

/**
 * Every visible worksheet, with merged cells filled from their top-left value.
 *
 * Class records lean on merges for their header bands — "WRITTEN WORKS (30%)"
 * spans ten activity columns — and SheetJS only stores the value in the first
 * cell. Filling the range lets the parser see which band each column sits
 * under. Blank rows are kept so reported row numbers match the file.
 */
export async function readWorkbookSheets(file: File): Promise<SheetMatrix[]> {
  const data = await file.arrayBuffer()
  const wb = XLSX.read(data, { type: 'array' })
  const hidden = new Set(
    (wb.Workbook?.Sheets ?? [])
      .filter((sheet) => (sheet.Hidden ?? 0) !== 0)
      .map((sheet) => sheet.name),
  )
  const sheets: SheetMatrix[] = []
  for (const name of wb.SheetNames) {
    if (hidden.has(name)) continue
    const ws = wb.Sheets[name]
    if (!ws) continue
    const rows = toMatrix(ws)
    const origin = ws['!ref'] ? XLSX.utils.decode_range(ws['!ref']).s : { r: 0, c: 0 }
    for (const merge of ws['!merges'] ?? []) {
      const top = merge.s.r - origin.r
      const left = merge.s.c - origin.c
      const value = rows[top]?.[left] ?? ''
      if (value === '') continue
      for (let r = top; r <= merge.e.r - origin.r; r++) {
        const row = (rows[r] ??= [])
        for (let c = left; c <= merge.e.c - origin.c; c++) {
          if (row[c] === undefined || row[c] === '') row[c] = value
        }
      }
    }
    sheets.push({ name, rows })
  }
  return sheets
}
