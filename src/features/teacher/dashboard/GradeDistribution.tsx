import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/Button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import {
  computeConfiguredPeriodFinalGrade,
  computeConfiguredStudentGradebook,
  type GradebookStructure,
  type ScoreMap,
} from '@/lib/grading'
import type { ClassroomWithCount, Student } from '@/types/domain'

/** Bucket edges, highest first — also the render order. */
const BUCKETS = [
  { label: '90+', min: 90 },
  { label: '80-89', min: 80 },
  { label: '70-79', min: 70 },
  { label: '60-69', min: 60 },
  { label: '<60', min: -Infinity },
] as const

const ALL_PERIODS = '__all__'
const INITIAL_VISIBLE = 6

export interface GradebookLookup {
  structure: GradebookStructure
  scores: ScoreMap
}

interface Props {
  classrooms: ClassroomWithCount[]
  students: Student[]
  gradebooks: Map<string, GradebookLookup>
}

function bucketFor(final: number): string {
  return (BUCKETS.find((b) => final >= b.min) ?? BUCKETS[BUCKETS.length - 1]).label
}

/**
 * Grade distribution per classroom, drawn as plain CSS bars (no chart library).
 *
 * Grading periods are per-classroom rows with their own ids, so there is no
 * single period id spanning classrooms. The selector therefore works on period
 * *names* and each classroom resolves its own matching row; classrooms that
 * don't run that period say so instead of rendering a misleading empty chart.
 */
export function GradeDistribution({ classrooms, students, gradebooks }: Props) {
  const navigate = useNavigate()
  const [periodName, setPeriodName] = useState<string>(ALL_PERIODS)
  const [showAll, setShowAll] = useState(false)

  const periodNames = useMemo(() => {
    const names = new Set<string>()
    for (const { structure } of gradebooks.values()) {
      for (const period of structure.periods) names.add(period.name)
    }
    return [...names].sort((a, b) => a.localeCompare(b))
  }, [gradebooks])

  const rows = useMemo(() => {
    return classrooms.map((classroom) => {
      const gradebook = gradebooks.get(classroom.id)
      const roster = students.filter((s) => s.classroom_id === classroom.id)

      // Resolve this classroom's own row for the selected period name.
      const period =
        periodName === ALL_PERIODS
          ? null
          : gradebook?.structure.periods.find((p) => p.name === periodName)

      const missingPeriod = periodName !== ALL_PERIODS && !period
      const counts = new Map<string, number>(BUCKETS.map((b) => [b.label, 0]))
      let graded = 0

      if (gradebook && !missingPeriod) {
        for (const student of roster) {
          let final: number | null = null
          try {
            final = period
              ? computeConfiguredPeriodFinalGrade(
                  gradebook.structure,
                  gradebook.scores,
                  student.id,
                  period.id,
                )
              : computeConfiguredStudentGradebook(
                  gradebook.structure,
                  gradebook.scores,
                  student.id,
                ).final
          } catch {
            final = null
          }
          if (final === null) continue
          graded++
          const label = bucketFor(final)
          counts.set(label, (counts.get(label) ?? 0) + 1)
        }
      }

      return { classroom, counts, graded, missingPeriod, hasGradebook: !!gradebook }
    })
  }, [classrooms, students, gradebooks, periodName])

  const visible = showAll ? rows : rows.slice(0, INITIAL_VISIBLE)

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Grade distribution</p>
          <p className="mt-1 text-sm text-(--color-ink-muted)">
            How each class is spread across grade bands.
          </p>
        </div>
        <div className="w-44">
          <Select value={periodName} onValueChange={setPeriodName}>
            <SelectTrigger aria-label="Grading period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_PERIODS}>All periods</SelectItem>
              {periodNames.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-3 space-y-3">
        {visible.map(({ classroom, counts, graded, missingPeriod, hasGradebook }) => (
          <div
            key={classroom.id}
            className="rounded-md border border-(--color-border) bg-(--color-surface-0) p-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="truncate text-sm">{classroom.course_name}</div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  navigate({
                    to: '/teacher/classrooms/$classroomId/grades',
                    params: { classroomId: classroom.id },
                  })
                }
              >
                Grades
              </Button>
            </div>

            {!hasGradebook ? (
              <p className="mt-2 text-xs text-(--color-ink-faint)">
                Open this classroom&apos;s grade sheet to view subject-specific grades.
              </p>
            ) : missingPeriod ? (
              <p className="mt-2 text-xs text-(--color-ink-faint)">
                No {periodName} period in this class.
              </p>
            ) : graded === 0 ? (
              <p className="mt-2 text-xs text-(--color-ink-faint)">
                No graded students yet.
              </p>
            ) : (
              <ul className="mt-2 grid grid-cols-5 items-end gap-2">
                {BUCKETS.map(({ label }) => {
                  const count = counts.get(label) ?? 0
                  const percent = Math.round((count / graded) * 100)
                  return (
                    <li
                      key={label}
                      className="flex flex-col items-center gap-1"
                      // The visual bar is decorative; this carries the meaning.
                      aria-label={`${label}: ${count} of ${graded} students (${percent}%)`}
                    >
                      <div
                        aria-hidden
                        className="flex h-16 w-6 items-end overflow-hidden rounded-md bg-(--color-surface-3)"
                      >
                        <div
                          className="w-full rounded-md bg-(--color-accent-400) transition-[height] duration-300"
                          style={{ height: `${Math.max(4, percent)}%` }}
                        />
                      </div>
                      <span aria-hidden className="text-[10px] font-medium">
                        {count}
                      </span>
                      <span aria-hidden className="text-[10px] text-(--color-ink-faint)">
                        {label}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        ))}
      </div>

      {rows.length > INITIAL_VISIBLE && (
        <div className="mt-3 text-center">
          <Button variant="ghost" size="sm" onClick={() => setShowAll((v) => !v)}>
            {showAll ? 'Show fewer' : `Show all ${rows.length} classes`}
          </Button>
        </div>
      )}
    </div>
  )
}
