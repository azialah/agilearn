import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { cn } from '@/lib/cn'
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
  'relative z-10 px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent-400) rounded-t-sm'

/**
 * Shared by all four classroom surfaces, so switching tabs keeps the same strip
 * in the same place instead of reading as a jump to an unrelated page.
 *
 * The active marker is one underline that slides between tabs rather than a
 * border that blinks from one to the next — same visual language as the bottom
 * dock, and it carries the eye to where the content came from.
 */
export function ClassroomTabs({ classroomId }: { classroomId: string }) {
  const { t } = useLocale()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const onSlideshow = pathname.includes('/slideshow')

  const base = `/teacher/classrooms/${classroomId}`
  const activeIndex = onSlideshow
    ? TABS.length
    : pathname.startsWith(`${base}/grades`)
      ? 1
      : pathname.startsWith(`${base}/attendance`)
        ? 2
        : 0

  return (
    <SegmentedControl
      ariaLabel={t('classroomsTabsLabel')}
      // Each classroom tab is its own route component, so this strip remounts on
      // every switch — the key is what lets the underline slide rather than jump.
      persistKey={`classroom-tabs:${classroomId}`}
      activeIndex={activeIndex}
      count={TABS.length}
      // Dragging the strip navigates; a tap still falls through to each Link.
      // Slideshow is deliberately not a segment (no data-segment-index), so a
      // swipe cannot reach it — it takes over the screen behind a confirm that a
      // gesture would bypass.
      onCommit={(index) => {
        const tab = TABS[index]
        if (tab) navigate({ to: tab.to, params: { classroomId } })
      }}
      className="border-b border-(--color-border)"
      trackClassName="flex gap-1"
      pillClassName="bottom-0 h-0.5 rounded-full bg-(--color-accent-400)"
    >
      {(readIndex) => [
        ...TABS.map((tab, index) => (
          <Link
            key={tab.to}
            to={tab.to}
            params={{ classroomId }}
            data-segment-index={index}
            activeOptions={{ exact: tab.exact }}
            className={cn(
              TAB_CLASS,
              index === readIndex
                ? 'font-medium text-(--color-ink)'
                : 'text-(--color-ink-muted) hover:text-(--color-ink)',
            )}
          >
            {t(tab.labelKey)}
          </Link>
        )),
        /* Slideshow takes over the screen for presenting, so it is confirmed
             rather than entered on a stray click mid-class. */
        <ConfirmDialog
          key="slideshow"
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
            <button
              type="button"
              className={cn(
                TAB_CLASS,
                readIndex === TABS.length
                  ? 'font-medium text-(--color-ink)'
                  : 'text-(--color-ink-muted) hover:text-(--color-ink)',
              )}
            >
              {t('classroomsTabSlideshow')}
            </button>
          }
        />,
      ]}
    </SegmentedControl>
  )
}
