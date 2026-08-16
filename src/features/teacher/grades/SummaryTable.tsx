import { useMemo } from 'react'
import { cn } from '@/lib/cn'
import {
  computeChedFinalGrade,
  computeConfiguredStudentGradebook,
  computeTransmutedStudentGradebook,
  round2,
  type GradebookStructure,
  type ScoreMap,
  type TransmutationTable,
} from '@/lib/grading'
import { studentFullName, type GradingTemplate, type Student } from '@/types/domain'
import { useLocale, type MessageKey } from '@/lib/locale'

function fmt(value: number | null | undefined) {
  return value == null ? '—' : round2(value).toFixed(2)
}
const STICKY =
  'sticky left-0 z-20 border-r border-(--color-border-strong) bg-(--color-surface-1)'

/** Report-card label for the Final column, matching what's actually shown —
 * a raw percentage reads as ambiguous once it might be a transmuted DepEd
 * grade or a CHED 1.00-5.00 instead. */
export function finalColumnLabel(
  t: (key: MessageKey, params?: Record<string, string | number>) => string,
  gradingTemplate?: GradingTemplate,
): string {
  if (gradingTemplate === 'basic_education' || gradingTemplate === 'senior_high') {
    return t('gradesFinalTransmutedLabel')
  }
  if (gradingTemplate === 'higher_education') return t('gradesFinalChedLabel')
  return t('gradesFinalLabel')
}

export function SummaryTable({
  structure,
  scores,
  students,
  gradingTemplate,
  transmutationTable,
  chedIncrement,
}: {
  structure: GradebookStructure
  scores: ScoreMap
  students: Student[]
  /** Undefined/'custom' shows the raw computed percentage, unchanged. */
  gradingTemplate?: GradingTemplate
  /** Only consulted for 'basic_education'/'senior_high'. */
  transmutationTable?: TransmutationTable
  /** Only consulted for 'higher_education'. */
  chedIncrement?: number
}) {
  const { t } = useLocale()
  const rows = useMemo(
    () =>
      students.map((student) => {
        const gradebook = computeConfiguredStudentGradebook(structure, scores, student.id)
        const reportedFinal =
          (gradingTemplate === 'basic_education' || gradingTemplate === 'senior_high') &&
          transmutationTable
            ? computeTransmutedStudentGradebook(
                structure,
                scores,
                student.id,
                transmutationTable,
              ).final
            : gradingTemplate === 'higher_education'
              ? computeChedFinalGrade(structure, scores, student.id, chedIncrement)
              : gradebook.final
        return { student, gradebook, reportedFinal }
      }),
    [students, structure, scores, gradingTemplate, transmutationTable, chedIncrement],
  )
  return (
    <div className="scrollbar-thin overflow-x-auto rounded-lg border border-(--color-border)">
      <table className="border-collapse text-sm">
        <thead className="bg-(--color-surface-2) text-xs text-(--color-ink-faint)">
          <tr className="border-b border-(--color-border)">
            <th
              rowSpan={2}
              className={cn(STICKY, 'whitespace-nowrap px-3 py-2 text-left font-medium')}
            >
              {t('gradesStudentColumnHeader')}
            </th>
            {structure.periods.map((period) => (
              <th
                key={period.id}
                colSpan={structure.components.length}
                className="border-r border-(--color-border) px-3 py-2 text-center font-medium uppercase tracking-wide"
              >
                {period.name}
              </th>
            ))}
            <th
              colSpan={structure.components.length + 1}
              className="px-3 py-2 text-center font-medium uppercase tracking-wide"
            >
              {t('gradesOverallColumnHeader')}
            </th>
          </tr>
          <tr className="border-b border-(--color-border)">
            {structure.periods.flatMap((period) =>
              structure.components.map((component) => (
                <th
                  key={`${period.id}-${component.id}`}
                  className="whitespace-nowrap border-r border-(--color-border) px-3 py-1.5 text-right font-medium"
                >
                  {component.name}
                </th>
              )),
            )}
            {structure.components.map((component) => (
              <th
                key={component.id}
                className="whitespace-nowrap border-r border-(--color-border) px-3 py-1.5 text-right font-medium"
              >
                {component.name}
              </th>
            ))}
            <th className="whitespace-nowrap px-3 py-1.5 text-right font-medium">
              {finalColumnLabel(t, gradingTemplate)}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ student, gradebook, reportedFinal }) => (
            <tr
              key={student.id}
              className="border-b border-(--color-border) hover:bg-(--color-surface-1)/60"
            >
              <td className={cn(STICKY, 'whitespace-nowrap px-3 py-1.5 font-medium')}>
                {studentFullName(student)}
              </td>
              {structure.periods.flatMap((period) =>
                structure.components.map((component) => (
                  <td
                    key={`${period.id}-${component.id}`}
                    className="whitespace-nowrap border-r border-(--color-border) px-3 py-1.5 text-right tabular-nums text-(--color-ink-muted)"
                  >
                    {fmt(gradebook.perPeriod[period.id]?.[component.id])}
                  </td>
                )),
              )}
              {structure.components.map((component) => (
                <td
                  key={component.id}
                  className="whitespace-nowrap border-r border-(--color-border) px-3 py-1.5 text-right font-semibold tabular-nums"
                >
                  {fmt(gradebook.components[component.id])}
                </td>
              ))}
              <td className="whitespace-nowrap bg-(--color-accent-500)/10 px-3 py-1.5 text-right font-semibold tabular-nums text-(--color-accent-300)">
                {fmt(reportedFinal)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
