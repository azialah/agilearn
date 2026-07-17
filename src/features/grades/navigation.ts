/**
 * Pure keyboard-navigation helpers for the grade grid. A grid position is a
 * zero-based {row, col}. Rows are students; cols are the editable score
 * columns for the active period (left-to-right, in render order).
 *
 * These helpers are side-effect free and unit tested in navigation.test.ts.
 */

export interface CellPos {
  row: number
  col: number
}

export type NavDirection =
  'up' | 'down' | 'left' | 'right' | 'tab' | 'shift-tab' | 'enter'

function clamp(value: number, max: number): number {
  if (value < 0) return 0
  if (value > max) return max
  return value
}

/**
 * Compute the next selected cell for a navigation key. Rows/cols are clamped to
 * the grid; Tab/Shift-Tab wrap across row boundaries, arrow keys and Enter do
 * not. When there are no rows or columns the input position is returned as-is.
 */
export function nextCell(
  pos: CellPos,
  direction: NavDirection,
  rowCount: number,
  colCount: number,
): CellPos {
  if (rowCount <= 0 || colCount <= 0) return pos

  const lastRow = rowCount - 1
  const lastCol = colCount - 1

  switch (direction) {
    case 'up':
      return { row: clamp(pos.row - 1, lastRow), col: clamp(pos.col, lastCol) }
    case 'down':
    case 'enter':
      return { row: clamp(pos.row + 1, lastRow), col: clamp(pos.col, lastCol) }
    case 'left':
      return { row: clamp(pos.row, lastRow), col: clamp(pos.col - 1, lastCol) }
    case 'right':
      return { row: clamp(pos.row, lastRow), col: clamp(pos.col + 1, lastCol) }
    case 'tab': {
      if (pos.col < lastCol) return { row: pos.row, col: pos.col + 1 }
      // Wrap to the start of the next row; stay put on the final cell.
      if (pos.row < lastRow) return { row: pos.row + 1, col: 0 }
      return { row: lastRow, col: lastCol }
    }
    case 'shift-tab': {
      if (pos.col > 0) return { row: pos.row, col: pos.col - 1 }
      // Wrap to the end of the previous row; stay put on the first cell.
      if (pos.row > 0) return { row: pos.row - 1, col: lastCol }
      return { row: 0, col: 0 }
    }
    default:
      return pos
  }
}

/** Map a keyboard event key to a navigation direction, or null if irrelevant. */
export function directionForKey(key: string, shiftKey: boolean): NavDirection | null {
  switch (key) {
    case 'ArrowUp':
      return 'up'
    case 'ArrowDown':
      return 'down'
    case 'ArrowLeft':
      return 'left'
    case 'ArrowRight':
      return 'right'
    case 'Enter':
      return 'enter'
    case 'Tab':
      return shiftKey ? 'shift-tab' : 'tab'
    default:
      return null
  }
}

/**
 * Validate a raw score input against an activity's max score. Empty input is
 * treated as clearing the score (valid, value null). Returns a discriminated
 * result the cell uses for inline feedback.
 */
export type ScoreParseResult =
  { ok: true; value: number | null } | { ok: false; reason: string }

export function parseScoreInput(raw: string, maxScore: number): ScoreParseResult {
  const trimmed = raw.trim()
  if (trimmed === '') return { ok: true, value: null }

  const value = Number(trimmed)
  if (!Number.isFinite(value)) return { ok: false, reason: 'Enter a number' }
  if (value < 0) return { ok: false, reason: 'Cannot be negative' }
  if (value > maxScore) return { ok: false, reason: `Max is ${maxScore}` }

  return { ok: true, value }
}
