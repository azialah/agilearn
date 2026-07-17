import type { BadgeTone } from '@/components/ui/Badge'
import type { AttendanceStatus } from '@/types/domain'

interface StatusMeta {
  label: string
  short: string
  tone: BadgeTone
  /** Solid dot / bar color for visual indicators. */
  color: string
  /** Ring + background used by the active segment of the toggle. */
  activeClass: string
}

export const STATUS_META: Record<AttendanceStatus, StatusMeta> = {
  present: {
    label: 'Present',
    short: 'P',
    tone: 'success',
    color: 'var(--color-success)',
    activeClass:
      'bg-[var(--color-success)]/15 text-[var(--color-success)] ring-1 ring-[var(--color-success)]/40',
  },
  late: {
    label: 'Late',
    short: 'L',
    tone: 'warning',
    color: 'var(--color-warning)',
    activeClass:
      'bg-[var(--color-warning)]/15 text-[var(--color-warning)] ring-1 ring-[var(--color-warning)]/40',
  },
  excused: {
    label: 'Excused',
    short: 'E',
    tone: 'accent',
    color: 'var(--color-accent-350)',
    activeClass:
      'bg-[var(--color-accent-500)]/20 text-[var(--color-accent-300)] ring-1 ring-[var(--color-accent-400)]/40',
  },
  absent: {
    label: 'Absent',
    short: 'A',
    tone: 'danger',
    color: 'var(--color-danger)',
    activeClass:
      'bg-[var(--color-danger)]/15 text-[var(--color-danger)] ring-1 ring-[var(--color-danger)]/40',
  },
}
