import { useMemo } from 'react'
import { TriangleAlert } from 'lucide-react'
import { useLocale } from '@/lib/locale'
import { findWeightIssues, type GradebookStructure } from '@/lib/grading'

/**
 * Surfaces weight totals that miss 100%.
 *
 * The engine renormalizes such a structure and still produces grades, so
 * without this the mismatch is invisible: a teacher who leaves the share field
 * blank on two periods gets weights of [1, 1] and a perfectly plausible-looking
 * gradebook that is not the split they asked for. (This used to be worse — the
 * whole gradebook silently read as blank.) Warn, don't hide the grades.
 */
export function WeightIssuesBanner({ structure }: { structure: GradebookStructure }) {
  const { t } = useLocale()
  const issues = useMemo(() => findWeightIssues(structure), [structure])
  if (issues.length === 0) return null

  const nameOf = (list: { id: string; name: string }[], id?: string) =>
    list.find((item) => item.id === id)?.name ?? ''

  return (
    <section
      aria-label={t('gradesWeightIssueTitle')}
      className="space-y-2 rounded-2xl border border-(--color-warning)/40 bg-(--color-warning)/10 p-4"
    >
      <p className="flex items-center gap-2 text-sm font-medium text-(--color-ink)">
        <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
        {t('gradesWeightIssueTitle')}
      </p>
      <ul className="space-y-1 text-sm text-(--color-ink-muted)">
        {issues.map((issue) => (
          <li key={`${issue.level}:${issue.periodId ?? ''}:${issue.componentId ?? ''}`}>
            {issue.level === 'period' &&
              t('gradesWeightIssuePeriods', { total: issue.totalPercent })}
            {issue.level === 'component' &&
              t('gradesWeightIssueComponents', { total: issue.totalPercent })}
            {issue.level === 'category' &&
              t('gradesWeightIssueCategories', {
                period: nameOf(structure.periods, issue.periodId),
                component: nameOf(structure.components, issue.componentId),
                total: issue.totalPercent,
              })}
          </li>
        ))}
      </ul>
      <p className="text-sm text-(--color-ink-faint)">
        {t('gradesWeightIssueExplanation')}
      </p>
    </section>
  )
}
