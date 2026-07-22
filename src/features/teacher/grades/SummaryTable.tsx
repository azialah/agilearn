import { useMemo } from 'react'
import { cn } from '@/lib/cn'
import {
  computeConfiguredStudentGradebook,
  round2,
  type GradebookStructure,
  type ScoreMap,
} from '@/lib/grading'
import { studentFullName, type Student } from '@/types/domain'

function fmt(value: number | null | undefined) {
  return value == null ? '—' : round2(value).toFixed(2)
}
const STICKY =
  'sticky left-0 z-20 border-r border-[var(--color-border-strong)] bg-[var(--color-surface-1)]'

export function SummaryTable({
  structure,
  scores,
  students,
}: {
  structure: GradebookStructure
  scores: ScoreMap
  students: Student[]
}) {
  const rows = useMemo(
    () =>
      students.map((student) => ({
        student,
        gradebook: computeConfiguredStudentGradebook(structure, scores, student.id),
      })),
    [students, structure, scores],
  )
  return (
    <div className="scrollbar-thin overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)]">
      <table className="border-collapse text-sm">
        <thead className="bg-[var(--color-surface-2)] text-xs text-[var(--color-ink-faint)]">
          <tr className="border-b border-[var(--color-border)]">
            <th
              rowSpan={2}
              className={cn(STICKY, 'whitespace-nowrap px-3 py-2 text-left font-medium')}
            >
              Student
            </th>
            {structure.periods.map((period) => (
              <th
                key={period.id}
                colSpan={structure.components.length}
                className="border-r border-[var(--color-border)] px-3 py-2 text-center font-medium uppercase tracking-wide"
              >
                {period.name}
              </th>
            ))}
            <th
              colSpan={structure.components.length + 1}
              className="px-3 py-2 text-center font-medium uppercase tracking-wide"
            >
              Overall
            </th>
          </tr>
          <tr className="border-b border-[var(--color-border)]">
            {structure.periods.flatMap((period) =>
              structure.components.map((component) => (
                <th
                  key={`${period.id}-${component.id}`}
                  className="whitespace-nowrap border-r border-[var(--color-border)] px-3 py-1.5 text-right font-medium"
                >
                  {component.name}
                </th>
              )),
            )}
            {structure.components.map((component) => (
              <th
                key={component.id}
                className="whitespace-nowrap border-r border-[var(--color-border)] px-3 py-1.5 text-right font-medium"
              >
                {component.name}
              </th>
            ))}
            <th className="whitespace-nowrap px-3 py-1.5 text-right font-medium">
              Final
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ student, gradebook }) => (
            <tr
              key={student.id}
              className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-1)]/60"
            >
              <td className={cn(STICKY, 'whitespace-nowrap px-3 py-1.5 font-medium')}>
                {studentFullName(student)}
              </td>
              {structure.periods.flatMap((period) =>
                structure.components.map((component) => (
                  <td
                    key={`${period.id}-${component.id}`}
                    className="whitespace-nowrap border-r border-[var(--color-border)] px-3 py-1.5 text-right tabular-nums text-[var(--color-ink-muted)]"
                  >
                    {fmt(gradebook.perPeriod[period.id]?.[component.id])}
                  </td>
                )),
              )}
              {structure.components.map((component) => (
                <td
                  key={component.id}
                  className="whitespace-nowrap border-r border-[var(--color-border)] px-3 py-1.5 text-right font-semibold tabular-nums"
                >
                  {fmt(gradebook.components[component.id])}
                </td>
              ))}
              <td className="whitespace-nowrap bg-[var(--color-accent-500)]/10 px-3 py-1.5 text-right font-semibold tabular-nums text-[var(--color-accent-300)]">
                {fmt(gradebook.final)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
