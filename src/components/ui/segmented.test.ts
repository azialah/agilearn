import { describe, it, expect } from 'vitest'
import {
  distanceOutside,
  pillGeometry,
  sameGeometry,
  segmentIndexAt,
  type Span,
} from './segmented'

describe('pillGeometry', () => {
  const track: Span = { left: 100, width: 400 }

  it('expresses the segment as percentages of the track', () => {
    expect(pillGeometry(track, { left: 200, width: 100 })).toEqual({
      leftPercent: 25,
      widthPercent: 25,
    })
  })

  it('is unchanged by a proportional resize — the whole reason it is a percentage', () => {
    const before = pillGeometry(track, { left: 200, width: 100 })
    const after = pillGeometry({ left: 50, width: 200 }, { left: 100, width: 50 })
    expect(after).toEqual(before)
  })

  it('survives a zero-width track without dividing by zero', () => {
    expect(pillGeometry({ left: 0, width: 0 }, { left: 0, width: 0 })).toEqual({
      leftPercent: 0,
      widthPercent: 0,
    })
  })
})

describe('sameGeometry', () => {
  it('treats sub-pixel jitter as unchanged so no re-render is scheduled', () => {
    const a = { leftPercent: 25, widthPercent: 25 }
    expect(sameGeometry(a, { leftPercent: 25.0001, widthPercent: 24.9999 })).toBe(true)
  })

  it('sees a real move', () => {
    const a = { leftPercent: 25, widthPercent: 25 }
    expect(sameGeometry(a, { leftPercent: 50, widthPercent: 25 })).toBe(false)
  })

  it('is false against no previous geometry', () => {
    expect(sameGeometry(null, { leftPercent: 0, widthPercent: 10 })).toBe(false)
  })
})

describe('segmentIndexAt', () => {
  // Deliberately gapped, as the real bar is.
  const segments: Span[] = [
    { left: 0, width: 40 },
    { left: 50, width: 40 },
    { left: 100, width: 40 },
  ]

  it('finds the segment under the finger', () => {
    expect(segmentIndexAt(segments, 20)).toBe(0)
    expect(segmentIndexAt(segments, 70)).toBe(1)
    expect(segmentIndexAt(segments, 120)).toBe(2)
  })

  it('picks the nearest when the finger is in a gap', () => {
    expect(segmentIndexAt(segments, 44)).toBe(0)
    expect(segmentIndexAt(segments, 47)).toBe(1)
  })

  it('clamps past either end rather than losing the preview', () => {
    expect(segmentIndexAt(segments, -500)).toBe(0)
    expect(segmentIndexAt(segments, 5000)).toBe(2)
  })

  it('returns null only when there is nothing to point at', () => {
    expect(segmentIndexAt([], 10)).toBeNull()
  })
})

describe('distanceOutside', () => {
  const box = { left: 0, right: 100, top: 0, bottom: 50 }

  it('is zero anywhere inside', () => {
    expect(distanceOutside(box, 50, 25)).toBe(0)
    expect(distanceOutside(box, 0, 0)).toBe(0)
  })

  it('measures straight out from an edge', () => {
    expect(distanceOutside(box, 50, 80)).toBe(30)
    expect(distanceOutside(box, -10, 25)).toBe(10)
  })

  it('measures diagonally from a corner', () => {
    expect(distanceOutside(box, 103, 54)).toBeCloseTo(5)
  })
})
