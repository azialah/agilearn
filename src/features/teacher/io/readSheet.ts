/** Read the first worksheet of an uploaded file into a plain array-of-arrays. */

import * as XLSX from 'xlsx'

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
