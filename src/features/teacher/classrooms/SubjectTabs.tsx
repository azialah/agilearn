import { cn } from '@/lib/cn'
import { useLocale } from '@/lib/locale'
import type { CourseSubject, CourseSubjectKind } from '@/types/domain'

export const KIND_LABEL: Record<CourseSubjectKind, string> = {
  lecture: 'Lecture',
  laboratory: 'Laboratory',
  other: 'Other',
}

/** Kind-based label for a college Lecture/Laboratory pair; the subject's own
 * name for everything else — an elementary or high-school subject is always
 * `kind: 'other'`, so a kind-only label would show "Other" for every subject
 * in the classroom, which tells nothing apart. */
export function subjectLabel(subject: CourseSubject): string {
  return subject.kind === 'other' ? subject.name : KIND_LABEL[subject.kind]
}

/**
 * Switches which subject's grades/attendance are showing. A plain flex-wrap
 * row of pills rather than a bordered segmented control — a college
 * classroom has 2 subjects, but an elementary one can have 7+, and this
 * needs to scale to both without a second "many items" layout. Matches
 * ClassroomMeta's own subject-badge row for the same reason.
 */
export function SubjectTabs({
  subjects,
  value,
  onChange,
}: {
  subjects: CourseSubject[]
  value: string
  onChange: (subjectId: string) => void
}) {
  const { t } = useLocale()
  if (subjects.length <= 1) return null
  return (
    <div
      role="group"
      aria-label={t('classroomsSubjectTabsLabel')}
      className="flex flex-wrap gap-2"
    >
      {subjects.map((subject) => {
        const active = value === subject.id
        return (
          <button
            key={subject.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(subject.id)}
            className={cn(
              'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
              active
                ? 'bg-(--color-accent-400) text-(--color-accent-fg)'
                : 'border border-(--color-border) bg-(--color-surface-1) text-(--color-ink-muted) hover:bg-(--color-surface-2) hover:text-(--color-ink)',
            )}
          >
            {subjectLabel(subject)}
          </button>
        )
      })}
    </div>
  )
}
