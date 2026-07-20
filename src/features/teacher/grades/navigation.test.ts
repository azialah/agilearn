import { describe, it, expect } from 'vitest'
import { directionForKey, nextCell, parseScoreInput, type CellPos } from './navigation'

const ROWS = 3
const COLS = 4

describe('nextCell', () => {
  it('moves with arrow keys and clamps at edges', () => {
    expect(nextCell({ row: 1, col: 1 }, 'up', ROWS, COLS)).toEqual({ row: 0, col: 1 })
    expect(nextCell({ row: 1, col: 1 }, 'down', ROWS, COLS)).toEqual({ row: 2, col: 1 })
    expect(nextCell({ row: 1, col: 1 }, 'left', ROWS, COLS)).toEqual({ row: 1, col: 0 })
    expect(nextCell({ row: 1, col: 1 }, 'right', ROWS, COLS)).toEqual({ row: 1, col: 2 })
  })

  it('does not move past the top or left edge', () => {
    expect(nextCell({ row: 0, col: 0 }, 'up', ROWS, COLS)).toEqual({ row: 0, col: 0 })
    expect(nextCell({ row: 0, col: 0 }, 'left', ROWS, COLS)).toEqual({ row: 0, col: 0 })
  })

  it('does not move past the bottom or right edge', () => {
    expect(nextCell({ row: 2, col: 3 }, 'down', ROWS, COLS)).toEqual({ row: 2, col: 3 })
    expect(nextCell({ row: 2, col: 3 }, 'right', ROWS, COLS)).toEqual({ row: 2, col: 3 })
  })

  it('Enter behaves like Down', () => {
    expect(nextCell({ row: 0, col: 2 }, 'enter', ROWS, COLS)).toEqual({ row: 1, col: 2 })
    expect(nextCell({ row: 2, col: 2 }, 'enter', ROWS, COLS)).toEqual({ row: 2, col: 2 })
  })

  it('Tab advances right and wraps to the next row', () => {
    expect(nextCell({ row: 0, col: 0 }, 'tab', ROWS, COLS)).toEqual({ row: 0, col: 1 })
    expect(nextCell({ row: 0, col: 3 }, 'tab', ROWS, COLS)).toEqual({ row: 1, col: 0 })
  })

  it('Tab on the very last cell stays put', () => {
    expect(nextCell({ row: 2, col: 3 }, 'tab', ROWS, COLS)).toEqual({ row: 2, col: 3 })
  })

  it('Shift-Tab retreats left and wraps to the previous row', () => {
    expect(nextCell({ row: 1, col: 2 }, 'shift-tab', ROWS, COLS)).toEqual({
      row: 1,
      col: 1,
    })
    expect(nextCell({ row: 1, col: 0 }, 'shift-tab', ROWS, COLS)).toEqual({
      row: 0,
      col: 3,
    })
  })

  it('Shift-Tab on the first cell stays put', () => {
    expect(nextCell({ row: 0, col: 0 }, 'shift-tab', ROWS, COLS)).toEqual({
      row: 0,
      col: 0,
    })
  })

  it('returns the input position when the grid is empty', () => {
    const pos: CellPos = { row: 0, col: 0 }
    expect(nextCell(pos, 'down', 0, 0)).toBe(pos)
    expect(nextCell(pos, 'right', 3, 0)).toBe(pos)
  })
})

describe('directionForKey', () => {
  it('maps arrow keys and Enter', () => {
    expect(directionForKey('ArrowUp', false)).toBe('up')
    expect(directionForKey('ArrowDown', false)).toBe('down')
    expect(directionForKey('ArrowLeft', false)).toBe('left')
    expect(directionForKey('ArrowRight', false)).toBe('right')
    expect(directionForKey('Enter', false)).toBe('enter')
  })

  it('maps Tab and Shift-Tab', () => {
    expect(directionForKey('Tab', false)).toBe('tab')
    expect(directionForKey('Tab', true)).toBe('shift-tab')
  })

  it('ignores unrelated keys', () => {
    expect(directionForKey('a', false)).toBeNull()
    expect(directionForKey('Escape', false)).toBeNull()
  })
})

describe('parseScoreInput', () => {
  it('treats empty input as clearing the score', () => {
    expect(parseScoreInput('', 100)).toEqual({ ok: true, value: null })
    expect(parseScoreInput('   ', 100)).toEqual({ ok: true, value: null })
  })

  it('accepts valid numbers within range', () => {
    expect(parseScoreInput('42', 100)).toEqual({ ok: true, value: 42 })
    expect(parseScoreInput('0', 100)).toEqual({ ok: true, value: 0 })
    expect(parseScoreInput('12.5', 100)).toEqual({ ok: true, value: 12.5 })
    expect(parseScoreInput('100', 100)).toEqual({ ok: true, value: 100 })
  })

  it('rejects non-numeric input', () => {
    expect(parseScoreInput('abc', 100).ok).toBe(false)
  })

  it('rejects negative values', () => {
    expect(parseScoreInput('-1', 100)).toEqual({
      ok: false,
      reason: 'Cannot be negative',
    })
  })

  it('rejects values above the max score', () => {
    expect(parseScoreInput('101', 100)).toEqual({ ok: false, reason: 'Max is 100' })
  })
})
