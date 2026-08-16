import type { BadgeTone } from '@/components/ui/Badge'
import type { AttendanceStatus } from '@/types/domain'
import type { useLocale } from '@/lib/locale'

interface StatusMeta {
  label: string
  short: string
  tone: BadgeTone
  /** Solid dot / bar color for visual indicators. */
  color: string
  /** Ring + background used by the active segment of the toggle. */
  activeClass: string
}

const STATUS_STYLE: Record<AttendanceStatus, Omit<StatusMeta, 'label' | 'short'>> = {
  present: {
    tone: 'success',
    color: 'var(--color-success)',
    activeClass:
      'bg-(--color-success)/15 text-(--color-success) ring-1 ring-(--color-success)/40',
  },
  late: {
    tone: 'warning',
    color: 'var(--color-warning)',
    activeClass:
      'bg-(--color-warning)/15 text-(--color-warning) ring-1 ring-(--color-warning)/40',
  },
  excused: {
    tone: 'accent',
    color: 'var(--color-accent-350)',
    activeClass:
      'bg-(--color-accent-500)/20 text-(--color-accent-300) ring-1 ring-(--color-accent-400)/40',
  },
  absent: {
    tone: 'danger',
    color: 'var(--color-danger)',
    activeClass:
      'bg-(--color-danger)/15 text-(--color-danger) ring-1 ring-(--color-danger)/40',
  },
}

/** Localized status labels, built from the active locale's `t()`. */
export function getStatusMeta(
  t: ReturnType<typeof useLocale>['t'],
): Record<AttendanceStatus, StatusMeta> {
  return {
    present: {
      ...STATUS_STYLE.present,
      label: t('attendanceStatusPresentLabel'),
      short: t('attendanceStatusPresentShort'),
    },
    late: {
      ...STATUS_STYLE.late,
      label: t('attendanceStatusLateLabel'),
      short: t('attendanceStatusLateShort'),
    },
    excused: {
      ...STATUS_STYLE.excused,
      label: t('attendanceStatusExcusedLabel'),
      short: t('attendanceStatusExcusedShort'),
    },
    absent: {
      ...STATUS_STYLE.absent,
      label: t('attendanceStatusAbsentLabel'),
      short: t('attendanceStatusAbsentShort'),
    },
  }
}
