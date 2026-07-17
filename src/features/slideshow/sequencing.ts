/**
 * Pure slide-sequencing helpers for the grade slideshow. Side-effect free and
 * unit tested in sequencing.test.ts.
 *
 * Every student contributes exactly two slides, in order: a grade breakdown
 * followed by a celebratory final average. Slide indices are therefore
 * `studentIndex * 2 + (kind === 'average' ? 1 : 0)`.
 */

export type SlideKind = 'breakdown' | 'average'

export interface Slide {
  studentIndex: number
  kind: SlideKind
}

/** Build the flat, ordered slide list for a roster of `studentCount` students. */
export function buildSlides(studentCount: number): Slide[] {
  const slides: Slide[] = []
  for (let i = 0; i < Math.max(0, Math.floor(studentCount)); i++) {
    slides.push({ studentIndex: i, kind: 'breakdown' })
    slides.push({ studentIndex: i, kind: 'average' })
  }
  return slides
}

/** Wrap an index into `[0, total)`, handling negative and overflow values. */
export function wrapIndex(index: number, total: number): number {
  if (total <= 0) return 0
  return ((index % total) + total) % total
}

export interface SlideCounter {
  /** 1-based position of the current student. */
  studentNumber: number
  totalStudents: number
  /** Human label for the current slide kind. */
  kindLabel: string
}

const KIND_LABEL: Record<SlideKind, string> = {
  breakdown: 'Grade Breakdown',
  average: 'Final Average',
}

/**
 * Describe the current slide for the on-screen counter. `total` is the total
 * number of slides (two per student).
 */
export function slideCounter(index: number, total: number): SlideCounter {
  const totalStudents = Math.ceil(total / 2)
  if (total <= 0) {
    return { studentNumber: 0, totalStudents: 0, kindLabel: KIND_LABEL.breakdown }
  }
  const safe = wrapIndex(index, total)
  return {
    studentNumber: Math.floor(safe / 2) + 1,
    totalStudents,
    kindLabel: safe % 2 === 0 ? KIND_LABEL.breakdown : KIND_LABEL.average,
  }
}

/** Resolve a slide index back to its `{ studentIndex, kind }` descriptor. */
export function slideAt(index: number, total: number): Slide {
  const safe = wrapIndex(index, total)
  return {
    studentIndex: Math.floor(safe / 2),
    kind: safe % 2 === 0 ? 'breakdown' : 'average',
  }
}
