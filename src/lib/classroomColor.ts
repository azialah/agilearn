/**
 * Per-classroom accent, like colouring a folder in a file drive.
 *
 * `classrooms.color` is nullable: NULL means "auto", and the colour is derived
 * from the id so an untouched classroom still looks distinct from its
 * neighbours — and keeps the same colour on every device, without a write.
 */

export const CLASSROOM_COLORS = [
  'slate',
  'orange',
  'amber',
  'green',
  'teal',
  'blue',
  'plum',
  'rose',
] as const

export type ClassroomColor = (typeof CLASSROOM_COLORS)[number]

interface ColorClasses {
  /** Solid swatch — the dot on the header and the picker buttons. */
  dot: string
  /** Left edge of the classroom card. */
  edge: string
  /** Tinted surface behind an icon or chip. */
  soft: string
}

export const CLASSROOM_COLOR_CLASSES: Record<ClassroomColor, ColorClasses> = {
  slate: { dot: 'bg-slate-500', edge: 'bg-slate-500', soft: 'bg-slate-500/12' },
  orange: {
    dot: 'bg-(--color-accent-400)',
    edge: 'bg-(--color-accent-400)',
    soft: 'bg-(--color-accent-400)/12',
  },
  amber: { dot: 'bg-amber-500', edge: 'bg-amber-500', soft: 'bg-amber-500/12' },
  green: { dot: 'bg-emerald-500', edge: 'bg-emerald-500', soft: 'bg-emerald-500/12' },
  teal: { dot: 'bg-teal-500', edge: 'bg-teal-500', soft: 'bg-teal-500/12' },
  blue: { dot: 'bg-sky-500', edge: 'bg-sky-500', soft: 'bg-sky-500/12' },
  plum: { dot: 'bg-violet-500', edge: 'bg-violet-500', soft: 'bg-violet-500/12' },
  rose: { dot: 'bg-rose-500', edge: 'bg-rose-500', soft: 'bg-rose-500/12' },
}

function isClassroomColor(value: string): value is ClassroomColor {
  return (CLASSROOM_COLORS as readonly string[]).includes(value)
}

/**
 * The stored colour when the teacher picked one, otherwise a stable colour
 * derived from the id. Same id always yields the same colour.
 */
export function classroomColor(classroom: {
  id: string
  color?: string | null
}): ClassroomColor {
  const chosen = classroom.color?.trim()
  if (chosen && isClassroomColor(chosen)) return chosen

  let hash = 0
  for (const char of classroom.id) {
    hash = (hash * 31 + char.charCodeAt(0)) % 100000
  }
  return CLASSROOM_COLORS[hash % CLASSROOM_COLORS.length]
}

export function classroomColorClasses(classroom: {
  id: string
  color?: string | null
}): ColorClasses {
  return CLASSROOM_COLOR_CLASSES[classroomColor(classroom)]
}
