import { useMemo, useState } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { cn } from '@/lib/cn'
import {
  computeCategoryPercent,
  computeStudentGradebook,
  round2,
  type ComponentWeights,
  type GradebookStructure,
  type ScoreMap,
} from '@/lib/grading'
import { studentFullName, type GradeComponent, type Student } from '@/types/domain'
import { useUpsertScore } from '@/lib/queries/grades'
import { useToast } from '@/components/ui/toast'
import { ScoreCell } from './ScoreCell'
import { nextCell, type CellPos, type NavDirection } from './navigation'

const COMPONENT_ORDER: GradeComponent[] = ['lecture', 'laboratory']
const COMPONENT_LABEL: Record<GradeComponent, string> = {
  lecture: 'Lecture',
  laboratory: 'Laboratory',
}

interface LeafInfo {
  kind: 'student' | 'score' | 'catpct' | 'periodgrade' | 'component' | 'final'
  activityId?: string
  categoryId?: string
  component?: GradeComponent
  maxScore?: number
  editIndex?: number
}

function fmtGrade(value: number | null): string {
  return value === null ? '—' : round2(value).toFixed(2)
}

const STICKY_CLASS =
  'sticky left-0 z-20 bg-[var(--color-surface-1)] border-r border-[var(--color-border-strong)]'

export function GradeGrid({
  classroomId,
  structure,
  scores,
  students,
  periodId,
  weights,
}: {
  classroomId: string
  structure: GradebookStructure
  scores: ScoreMap
  students: Student[]
  periodId: string
  weights: ComponentWeights
}) {
  const upsertScore = useUpsertScore()
  const { toast } = useToast()
  const [selected, setSelected] = useState<CellPos>({ row: 0, col: 0 })
  const [editing, setEditing] = useState<CellPos | null>(null)
  const [editSeed, setEditSeed] = useState<string | undefined>(undefined)

  // Flat list of editable activities in render order (component -> category ->
  // activity by position). The array index is each cell's navigation column.
  const { editableActivities, leafInfo, columns } = useMemo(() => {
    const columnHelper = createColumnHelper<Student>()
    const info = new Map<string, LeafInfo>()
    const editable: { activityId: string; maxScore: number }[] = []

    const cols: ColumnDef<Student, unknown>[] = []

    // Frozen student column.
    info.set('student', { kind: 'student' })
    cols.push(
      columnHelper.display({
        id: 'student',
        header: 'Student',
      }) as ColumnDef<Student, unknown>,
    )

    for (const component of COMPONENT_ORDER) {
      const categories = structure.categories.filter((c) => c.component === component)
      if (categories.length === 0) continue

      const categoryGroups: ColumnDef<Student, unknown>[] = []

      for (const category of categories) {
        const activities = structure.activities.filter(
          (a) => a.category_id === category.id && a.grading_period_id === periodId,
        )

        const activityLeaves: ColumnDef<Student, unknown>[] = activities.map(
          (activity) => {
            const id = `act:${activity.id}`
            info.set(id, {
              kind: 'score',
              activityId: activity.id,
              maxScore: activity.max_score,
              editIndex: editable.length,
            })
            editable.push({ activityId: activity.id, maxScore: activity.max_score })
            return columnHelper.display({
              id,
              header: () => (
                <div className="flex flex-col leading-tight">
                  <span className="truncate">{activity.name}</span>
                  <span className="text-[10px] font-normal text-[var(--color-ink-faint)]">
                    /{activity.max_score}
                  </span>
                </div>
              ),
            }) as ColumnDef<Student, unknown>
          },
        )

        const catPctId = `catpct:${category.id}`
        info.set(catPctId, {
          kind: 'catpct',
          categoryId: category.id,
          component,
        })
        activityLeaves.push(
          columnHelper.display({
            id: catPctId,
            header: '%',
          }) as ColumnDef<Student, unknown>,
        )

        categoryGroups.push(
          columnHelper.group({
            id: `catgroup:${category.id}`,
            header: `${category.name} · ${round2(category.weight)}`,
            columns: activityLeaves,
          }) as ColumnDef<Student, unknown>,
        )
      }

      const pgId = `pg:${component}`
      info.set(pgId, { kind: 'periodgrade', component })
      categoryGroups.push(
        columnHelper.display({
          id: pgId,
          header: `${COMPONENT_LABEL[component]} grade`,
        }) as ColumnDef<Student, unknown>,
      )

      cols.push(
        columnHelper.group({
          id: `comp:${component}`,
          header: COMPONENT_LABEL[component],
          columns: categoryGroups,
        }) as ColumnDef<Student, unknown>,
      )
    }

    // Summary group: component grades (all periods) + final.
    const summaryLeaves: ColumnDef<Student, unknown>[] = []
    for (const component of COMPONENT_ORDER) {
      const id = `component:${component}`
      info.set(id, { kind: 'component', component })
      summaryLeaves.push(
        columnHelper.display({
          id,
          header: COMPONENT_LABEL[component],
        }) as ColumnDef<Student, unknown>,
      )
    }
    info.set('final', { kind: 'final' })
    summaryLeaves.push(
      columnHelper.display({
        id: 'final',
        header: 'Final',
      }) as ColumnDef<Student, unknown>,
    )
    cols.push(
      columnHelper.group({
        id: 'summary',
        header: 'Overall',
        columns: summaryLeaves,
      }) as ColumnDef<Student, unknown>,
    )

    return { editableActivities: editable, leafInfo: info, columns: cols }
  }, [structure, periodId])

  const table = useReactTable({
    data: students,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  // Per-student computed gradebook, memoized against scores/structure.
  const gradebooks = useMemo(() => {
    const map = new Map<string, ReturnType<typeof computeStudentGradebook>>()
    for (const student of students) {
      map.set(student.id, computeStudentGradebook(structure, scores, student.id, weights))
    }
    return map
  }, [students, structure, scores, weights])

  function moveSelection(direction: NavDirection) {
    setEditing(null)
    setEditSeed(undefined)
    setSelected((prev) =>
      nextCell(prev, direction, students.length, editableActivities.length),
    )
  }

  function commitScore(
    student: Student,
    activityId: string,
    value: number | null,
    direction: NavDirection | null,
  ) {
    const previous = scores[activityId]?.[student.id] ?? null
    if (value !== previous) {
      upsertScore.mutate(
        { classroomId, activityId, studentId: student.id, score: value },
        {
          onError: (error) => {
            toast({
              title: 'Could not save score',
              description: error instanceof Error ? error.message : undefined,
              tone: 'error',
            })
          },
        },
      )
    }
    setEditing(null)
    setEditSeed(undefined)
    if (direction) {
      moveSelection(direction)
    }
  }

  const leafColumns = table.getAllLeafColumns()

  return (
    <div className="scrollbar-thin overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)]">
      <table className="border-collapse text-sm">
        <thead className="bg-[var(--color-surface-2)] text-xs text-[var(--color-ink-faint)]">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b border-[var(--color-border)]">
              {headerGroup.headers.map((header) => {
                const isStudent = header.column.id === 'student'
                return (
                  <th
                    key={header.id}
                    colSpan={header.colSpan}
                    className={cn(
                      'whitespace-nowrap border-r border-[var(--color-border)] px-3 py-2 text-left align-bottom font-medium',
                      isStudent && STICKY_CLASS,
                      !header.isPlaceholder &&
                        header.subHeaders.length > 0 &&
                        'text-center uppercase tracking-wide',
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                )
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row, rowIndex) => {
            const student = row.original
            const gradebook = gradebooks.get(student.id)
            return (
              <tr
                key={row.id}
                className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-1)]/60"
              >
                {leafColumns.map((column) => {
                  const info = leafInfo.get(column.id)
                  if (!info) return null

                  if (info.kind === 'student') {
                    return (
                      <td
                        key={column.id}
                        className={cn(
                          STICKY_CLASS,
                          'whitespace-nowrap px-3 py-1.5 font-medium text-[var(--color-ink)]',
                        )}
                      >
                        {studentFullName(student)}
                      </td>
                    )
                  }

                  if (info.kind === 'score') {
                    const activityId = info.activityId!
                    const editIndex = info.editIndex!
                    const value = scores[activityId]?.[student.id] ?? null
                    const isSelected =
                      selected.row === rowIndex && selected.col === editIndex
                    const isEditing =
                      editing?.row === rowIndex && editing?.col === editIndex
                    return (
                      <td
                        key={column.id}
                        className="border-r border-[var(--color-border)] p-0"
                      >
                        <ScoreCell
                          value={value}
                          maxScore={info.maxScore!}
                          isSelected={isSelected}
                          isEditing={!!isEditing}
                          isPending={upsertScore.isPending}
                          editSeed={isEditing ? editSeed : undefined}
                          onSelect={() => {
                            if (!isSelected)
                              setSelected({ row: rowIndex, col: editIndex })
                          }}
                          onStartEdit={(seed) => {
                            setSelected({ row: rowIndex, col: editIndex })
                            setEditSeed(seed)
                            setEditing({ row: rowIndex, col: editIndex })
                          }}
                          onCommit={(v, dir) => commitScore(student, activityId, v, dir)}
                          onCancel={() => {
                            setEditing(null)
                            setEditSeed(undefined)
                          }}
                          onNavigate={moveSelection}
                        />
                      </td>
                    )
                  }

                  // Computed read-only columns.
                  let text = '—'
                  let emphasize = false
                  if (info.kind === 'catpct') {
                    const activities = structure.activities.filter(
                      (a) =>
                        a.category_id === info.categoryId &&
                        a.grading_period_id === periodId,
                    )
                    text = fmtGrade(
                      computeCategoryPercent(activities, scores, student.id),
                    )
                  } else if (info.kind === 'periodgrade') {
                    text = fmtGrade(
                      gradebook?.perPeriod[periodId]?.[info.component!] ?? null,
                    )
                    emphasize = true
                  } else if (info.kind === 'component') {
                    text = fmtGrade(
                      info.component === 'lecture'
                        ? (gradebook?.lecture ?? null)
                        : (gradebook?.laboratory ?? null),
                    )
                    emphasize = true
                  } else if (info.kind === 'final') {
                    text = fmtGrade(gradebook?.final ?? null)
                    emphasize = true
                  }

                  return (
                    <td
                      key={column.id}
                      className={cn(
                        'whitespace-nowrap border-r border-[var(--color-border)] px-3 py-1.5 text-right tabular-nums',
                        emphasize
                          ? 'font-semibold text-[var(--color-ink)]'
                          : 'text-[var(--color-ink-muted)]',
                        info.kind === 'final' &&
                          'bg-[var(--color-accent-500)]/10 text-[var(--color-accent-300)]',
                      )}
                    >
                      {text}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
