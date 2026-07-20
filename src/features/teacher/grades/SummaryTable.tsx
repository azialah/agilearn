import { useMemo } from 'react'
import { cn } from '@/lib/cn'
import {
  computeStudentGradebook,
  round2,
  type ComponentWeights,
  type GradebookStructure,
  type ScoreMap,
} from '@/lib/grading'
import { studentFullName, type Student } from '@/types/domain'

function fmtGrade(value: number | null): string {
  return value === null ? '—' : round2(value).toFixed(2)
}

const STICKY_CLASS =
  'sticky left-0 z-20 bg-[var(--color-surface-1)] border-r border-[var(--color-border-strong)]'

export function SummaryTable({
  structure,
  scores,
  students,
  weights,
}: {
  structure: GradebookStructure
  scores: ScoreMap
  students: Student[]
  weights: ComponentWeights
}) {
  const rows = useMemo(
    () =>
      students.map((student) => ({
        student,
        gradebook: computeStudentGradebook(structure, scores, student.id, weights),
      })),
    [students, structure, scores, weights],
  )

  return (
    <div className="scrollbar-thin overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)]">
      <table className="border-collapse text-sm">
        <thead className="bg-[var(--color-surface-2)] text-xs text-[var(--color-ink-faint)]">
          <tr className="border-b border-[var(--color-border)]">
            <th
              rowSpan={2}
              className={cn(
                STICKY_CLASS,
                'whitespace-nowrap px-3 py-2 text-left align-bottom font-medium',
              )}
            >
              Student
            </th>
            {structure.periods.map((period) => (
              <th
                key={period.id}
                colSpan={2}
                className="whitespace-nowrap border-r border-[var(--color-border)] px-3 py-2 text-center font-medium uppercase tracking-wide"
              >
                {period.name}
              </th>
            ))}
            <th
              colSpan={3}
              className="whitespace-nowrap border-r border-[var(--color-border)] px-3 py-2 text-center font-medium uppercase tracking-wide"
            >
              Overall
            </th>
          </tr>
          <tr className="border-b border-[var(--color-border)]">
            {structure.periods.map((period) => (
              <PeriodSubHead key={period.id} />
            ))}
            <th className="whitespace-nowrap border-r border-[var(--color-border)] px-3 py-1.5 text-right font-medium">
              Lec
            </th>
            <th className="whitespace-nowrap border-r border-[var(--color-border)] px-3 py-1.5 text-right font-medium">
              Lab
            </th>
            <th className="whitespace-nowrap border-r border-[var(--color-border)] px-3 py-1.5 text-right font-medium">
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
              <td
                className={cn(
                  STICKY_CLASS,
                  'whitespace-nowrap px-3 py-1.5 font-medium text-[var(--color-ink)]',
                )}
              >
                {studentFullName(student)}
              </td>
              {structure.periods.map((period) => {
                const cell = gradebook.perPeriod[period.id]
                return (
                  <PeriodCells
                    key={period.id}
                    lecture={cell?.lecture ?? null}
                    laboratory={cell?.laboratory ?? null}
                  />
                )
              })}
              <td className="whitespace-nowrap border-r border-[var(--color-border)] px-3 py-1.5 text-right font-semibold tabular-nums text-[var(--color-ink)]">
                {fmtGrade(gradebook.lecture)}
              </td>
              <td className="whitespace-nowrap border-r border-[var(--color-border)] px-3 py-1.5 text-right font-semibold tabular-nums text-[var(--color-ink)]">
                {fmtGrade(gradebook.laboratory)}
              </td>
              <td className="whitespace-nowrap border-r border-[var(--color-border)] bg-[var(--color-accent-500)]/10 px-3 py-1.5 text-right font-semibold tabular-nums text-[var(--color-accent-300)]">
                {fmtGrade(gradebook.final)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PeriodSubHead() {
  return (
    <>
      <th className="whitespace-nowrap px-3 py-1.5 text-right font-medium">Lec</th>
      <th className="whitespace-nowrap border-r border-[var(--color-border)] px-3 py-1.5 text-right font-medium">
        Lab
      </th>
    </>
  )
}

function PeriodCells({
  lecture,
  laboratory,
}: {
  lecture: number | null
  laboratory: number | null
}) {
  return (
    <>
      <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums text-[var(--color-ink-muted)]">
        {fmtGrade(lecture)}
      </td>
      <td className="whitespace-nowrap border-r border-[var(--color-border)] px-3 py-1.5 text-right tabular-nums text-[var(--color-ink-muted)]">
        {fmtGrade(laboratory)}
      </td>
    </>
  )
}
