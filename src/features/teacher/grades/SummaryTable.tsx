import { useMemo } from 'react'
import { cn } from '@/lib/cn'
import {
  computeConfiguredStudentGradebook,
  computeReportedFinalGrade,
  isConfiguredGradeComplete,
  remarkFor,
  round2,
  summarizeClass,
  type GradebookStructure,
  type Remark,
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

const REMARK_LABEL: Record<Remark, MessageKey> = {
  PASSED: 'gradesRemarkPassed',
  FAILED: 'gradesRemarkFailed',
  INCOMPLETE: 'gradesRemarkIncomplete',
}

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
        // One shared reporting function, so the .xlsx and .pdf cannot drift
        // from what is on screen the way they used to.
        const reportedFinal = computeReportedFinalGrade(structure, scores, student.id, {
          gradingTemplate,
          table: transmutationTable,
          chedIncrement,
        })
        // Under ungradedAsZero a blank cell is a zero, not missing work, so
        // "has every score" would mark the whole class INCOMPLETE forever.
        // Having a computable final is the right completeness test there.
        const complete = structure.policy?.ungradedAsZero
          ? gradebook.final !== null
          : isConfiguredGradeComplete(structure, scores, student.id)
        const remark = remarkFor(gradebook.final, complete)
        return { student, gradebook, reportedFinal, remark }
      }),
    [students, structure, scores, gradingTemplate, transmutationTable, chedIncrement],
  )
  // The registrar's tally at the foot of the sheet: count / passed / failed /
  // incomplete. Reduces over remarks already computed above.
  const stats = useMemo(() => summarizeClass(rows.map((row) => row.remark)), [rows])
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
            <th className="whitespace-nowrap px-3 py-1.5 text-right font-medium">
              {t('gradesRemarksLabel')}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ student, gradebook, reportedFinal, remark }) => (
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
              <td
                className={cn(
                  'whitespace-nowrap px-3 py-1.5 text-right text-xs font-semibold',
                  remark === 'PASSED' && 'text-(--color-success)',
                  remark === 'FAILED' && 'text-(--color-danger)',
                  remark === 'INCOMPLETE' && 'text-(--color-ink-faint)',
                )}
              >
                {t(REMARK_LABEL[remark])}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-(--color-border) bg-(--color-surface-2) px-3 py-2 text-xs text-(--color-ink-muted)">
        <span>{t('gradesStatsCount', { n: stats.count })}</span>
        <span>{t('gradesStatsPassed', { n: stats.passed })}</span>
        <span>{t('gradesStatsFailed', { n: stats.failed })}</span>
        <span>{t('gradesStatsIncomplete', { n: stats.incomplete })}</span>
      </div>
    </div>
  )
}
