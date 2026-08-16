import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useLocale } from '@/lib/locale'

const TABS = [
  {
    labelKey: 'classroomsRosterHeading',
    to: '/teacher/classrooms/$classroomId',
    exact: true,
  },
  {
    labelKey: 'classroomsTabGrades',
    to: '/teacher/classrooms/$classroomId/grades',
    exact: false,
  },
  {
    labelKey: 'classroomsTabAttendance',
    to: '/teacher/classrooms/$classroomId/attendance',
    exact: false,
  },
] as const

const TAB_CLASS =
  '-mb-px border-b-2 border-transparent px-3 py-2 text-sm text-(--color-ink-muted) transition-colors hover:text-(--color-ink)'
const ACTIVE_TAB_CLASS =
  '-mb-px border-b-2 border-(--color-accent-400) px-3 py-2 text-sm font-medium text-(--color-ink)'

/**
 * Shared by all four classroom surfaces, so switching tabs keeps the same strip
 * in the same place instead of reading as a jump to an unrelated page.
 */
export function ClassroomTabs({ classroomId }: { classroomId: string }) {
  const { t } = useLocale()
  const navigate = useNavigate()
  const onSlideshow = useRouterState({
    select: (state) => state.location.pathname.includes('/slideshow'),
  })

  return (
    <nav className="flex gap-1 border-b border-(--color-border)">
      {TABS.map((tab) => (
        <Link
          key={tab.to}
          to={tab.to}
          params={{ classroomId }}
          activeOptions={{ exact: tab.exact }}
          className={TAB_CLASS}
          activeProps={{ className: ACTIVE_TAB_CLASS }}
        >
          {t(tab.labelKey)}
        </Link>
      ))}
      {/* Slideshow takes over the screen for presenting, so it is confirmed
          rather than entered on a stray click mid-class. */}
      <ConfirmDialog
        title={t('classroomsSlideshowConfirmTitle')}
        description={t('classroomsSlideshowConfirmDescription')}
        confirmLabel={t('classroomsSlideshowConfirmButton')}
        confirmVariant="primary"
        onConfirm={() =>
          navigate({
            to: '/teacher/classrooms/$classroomId/slideshow',
            params: { classroomId },
          })
        }
        trigger={
          <button type="button" className={onSlideshow ? ACTIVE_TAB_CLASS : TAB_CLASS}>
            {t('classroomsTabSlideshow')}
          </button>
        }
      />
    </nav>
  )
}
