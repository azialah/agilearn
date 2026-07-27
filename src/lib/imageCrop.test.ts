import { describe, expect, it } from 'vitest'
import { clampCrop, clampOffset, coverScale, rotatedSize } from './imageCrop'

describe('imageCrop', () => {
  it('swaps axes on quarter turns', () => {
    expect(rotatedSize(400, 200, 90)).toEqual({ width: 200, height: 400 })
    expect(rotatedSize(400, 200, 180)).toEqual({ width: 400, height: 200 })
  })

  it('covers the viewport from the short edge', () => {
    expect(coverScale(400, 200, 100)).toBe(0.5)
  })

  it('clamps panning to the overhang', () => {
    // 300px drawn in a 100px viewport leaves 100px of slack per side.
    expect(clampOffset(500, 300, 100)).toBe(100)
    expect(clampOffset(-500, 300, 100)).toBe(-100)
    expect(clampOffset(40, 300, 100)).toBe(40)
    // Exactly covering means no panning at all.
    expect(clampOffset(40, 100, 100)).toBe(0)
  })

  it('clamps against the rotated dimensions', () => {
    // 400x200 rotated 90° is 200x400: cover scale 0.5, so the long axis is now y.
    const crop = clampCrop(
      { zoom: 1, offsetX: 999, offsetY: 999, rotation: 90 },
      400,
      200,
      100,
    )
    expect(crop.offsetX).toBe(0)
    expect(crop.offsetY).toBe(50)
  })

  it('never zooms below cover', () => {
    expect(
      clampCrop({ zoom: 0.2, offsetX: 0, offsetY: 0, rotation: 0 }, 10, 10, 5).zoom,
    ).toBe(1)
  })
})
