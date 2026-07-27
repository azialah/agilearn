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
  computeConfiguredPeriodComponentGrade,
  computeConfiguredStudentGradebook,
  round2,
  type GradebookStructure,
  type ScoreMap,
} from '@/lib/grading'
import { studentFullName, type Student } from '@/types/domain'
import { useUpsertScore } from '@/lib/queries/grades'
import { useToast } from '@/components/ui/toast'
import { ScoreCell } from './ScoreCell'
import { nextCell, type CellPos, type NavDirection } from './navigation'

interface LeafInfo {
  kind: 'student' | 'score' | 'catpct' | 'periodgrade' | 'component' | 'final'
  activityId?: string
  categoryId?: string
  componentId?: string
  maxScore?: number
  editIndex?: number
}
const belongsToComponent = (
  category: GradebookStructure['categories'][number],
  componentId: string,
) =>
  category.grade_component_id === componentId ||
  (category.grade_component_id === null &&
    ((componentId === 'legacy-lecture' && category.component === 'lecture') ||
      (componentId === 'legacy-laboratory' && category.component === 'laboratory')))
const STICKY =
  'sticky left-0 z-20 bg-(--color-surface-1) border-r border-(--color-border-strong)'
const fmt = (value: number | null | undefined) =>
  value == null ? '—' : round2(value).toFixed(2)

export function GradeGrid({
  classroomId,
  courseSubjectId,
  structure,
  scores,
  students,
  periodId,
  focusStudentId,
}: {
  classroomId: string
  courseSubjectId?: string
  structure: GradebookStructure
  scores: ScoreMap
  students: Student[]
  periodId: string
  focusStudentId?: string
}) {
  const upsertScore = useUpsertScore()
  const { toast } = useToast()
  const [selected, setSelected] = useState<CellPos>({ row: 0, col: 0 })
  const [editing, setEditing] = useState<CellPos | null>(null)
  const [editSeed, setEditSeed] = useState<string>()
  const { editableActivities, leafInfo, columns } = useMemo(() => {
    const helper = createColumnHelper<Student>()
    const info = new Map<string, LeafInfo>()
    const editable: { activityId: string; maxScore: number }[] = []
    const cols: ColumnDef<Student, unknown>[] = [
      helper.display({ id: 'student', header: 'Student' }) as ColumnDef<Student, unknown>,
    ]
    info.set('student', { kind: 'student' })
    for (const component of structure.components) {
      const categories = structure.categories.filter(
        (category) =>
          belongsToComponent(category, component.id) &&
          (category.grading_period_id === periodId ||
            category.grading_period_id === null),
      )
      if (!categories.length) continue
      const categoryGroups: ColumnDef<Student, unknown>[] = []
      for (const category of categories) {
        const activities = structure.activities.filter(
          (activity) =>
            activity.category_id === category.id &&
            activity.grading_period_id === periodId,
        )
        const leaves = activities.map((activity) => {
          const id = `act:${activity.id}`
          info.set(id, {
            kind: 'score',
            activityId: activity.id,
            maxScore: activity.max_score,
            editIndex: editable.length,
          })
          editable.push({ activityId: activity.id, maxScore: activity.max_score })
          return helper.display({
            id,
            header: () => (
              <div className="flex flex-col leading-tight">
                <span className="truncate">{activity.name}</span>
                <span className="text-[10px] font-normal text-(--color-ink-faint)">
                  /{activity.max_score}
                </span>
              </div>
            ),
          }) as ColumnDef<Student, unknown>
        })
        const pctId = `cat:${category.id}`
        info.set(pctId, { kind: 'catpct', categoryId: category.id })
        leaves.push(
          helper.display({ id: pctId, header: '%' }) as ColumnDef<Student, unknown>,
        )
        categoryGroups.push(
          helper.group({
            id: `group:${category.id}`,
            header: `${category.name} · ${round2(category.weight)}`,
            columns: leaves,
          }) as ColumnDef<Student, unknown>,
        )
      }
      const gradeId = `period:${component.id}`
      info.set(gradeId, { kind: 'periodgrade', componentId: component.id })
      categoryGroups.push(
        helper.display({ id: gradeId, header: `${component.name} grade` }) as ColumnDef<
          Student,
          unknown
        >,
      )
      cols.push(
        helper.group({
          id: `component:${component.id}`,
          header: component.name,
          columns: categoryGroups,
        }) as ColumnDef<Student, unknown>,
      )
    }
    const summary: ColumnDef<Student, unknown>[] = structure.components.map(
      (component) => {
        const id = `summary:${component.id}`
        info.set(id, { kind: 'component', componentId: component.id })
        return helper.display({ id, header: component.name }) as ColumnDef<
          Student,
          unknown
        >
      },
    )
    info.set('final', { kind: 'final' })
    summary.push(
      helper.display({ id: 'final', header: 'Final' }) as ColumnDef<Student, unknown>,
    )
    cols.push(
      helper.group({ id: 'overall', header: 'Overall', columns: summary }) as ColumnDef<
        Student,
        unknown
      >,
    )
    return { editableActivities: editable, leafInfo: info, columns: cols }
  }, [structure, periodId])
  const gradebooks = useMemo(
    () =>
      new Map(
        students.map((student) => [
          student.id,
          computeConfiguredStudentGradebook(structure, scores, student.id),
        ]),
      ),
    [students, structure, scores],
  )
  const table = useReactTable({
    data: students,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })
  const move = (direction: NavDirection) => {
    setEditing(null)
    setEditSeed(undefined)
    setSelected((current) =>
      nextCell(current, direction, students.length, editableActivities.length),
    )
  }
  const commit = (
    student: Student,
    activityId: string,
    value: number | null,
    direction: NavDirection | null,
  ) => {
    if ((scores[activityId]?.[student.id] ?? null) !== value)
      upsertScore.mutate(
        {
          classroomId,
          courseSubjectId,
          activityId,
          studentId: student.id,
          score: value,
        },
        {
          onError: (error) =>
            toast({
              title: 'Could not save score',
              description: error instanceof Error ? error.message : undefined,
              tone: 'error',
            }),
        },
      )
    setEditing(null)
    setEditSeed(undefined)
    if (direction) move(direction)
  }
  const leaves = table.getAllLeafColumns()
  return (
    <div className="scrollbar-thin overflow-x-auto rounded-lg border border-(--color-border)">
      <table className="border-collapse text-sm">
        <thead className="bg-(--color-surface-2) text-xs text-(--color-ink-faint)">
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id} className="border-b border-(--color-border)">
              {group.headers.map((header) => (
                <th
                  key={header.id}
                  colSpan={header.colSpan}
                  className={cn(
                    'whitespace-nowrap border-r border-(--color-border) px-3 py-2 text-left align-bottom font-medium',
                    header.column.id === 'student' && STICKY,
                    !header.isPlaceholder &&
                      header.subHeaders.length > 0 &&
                      'text-center uppercase tracking-wide',
                  )}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row, rowIndex) => {
            const student = row.original
            const book = gradebooks.get(student.id)
            return (
              <tr
                key={row.id}
                data-student-id={student.id}
                className={cn(
                  'border-b border-(--color-border) hover:bg-(--color-surface-1)/60',
                  student.id === focusStudentId &&
                    'bg-(--color-accent-500)/15 outline outline-2 outline-(--color-accent-400)/55 outline-offset-[-2px]',
                )}
              >
                {leaves.map((column) => {
                  const info = leafInfo.get(column.id)
                  if (!info) return null
                  if (info.kind === 'student')
                    return (
                      <td
                        key={column.id}
                        className={cn(
                          STICKY,
                          'whitespace-nowrap px-3 py-1.5 font-medium',
                        )}
                      >
                        {studentFullName(student)}
                      </td>
                    )
                  if (info.kind === 'score') {
                    const value = scores[info.activityId!]?.[student.id] ?? null
                    const cell = { row: rowIndex, col: info.editIndex! }
                    const active = selected.row === cell.row && selected.col === cell.col
                    const isEditing =
                      editing?.row === cell.row && editing?.col === cell.col
                    return (
                      <td
                        key={column.id}
                        className="border-r border-(--color-border) p-0"
                      >
                        <ScoreCell
                          value={value}
                          maxScore={info.maxScore!}
                          isSelected={active}
                          isEditing={!!isEditing}
                          isPending={upsertScore.isPending}
                          editSeed={isEditing ? editSeed : undefined}
                          onSelect={() => !active && setSelected(cell)}
                          onStartEdit={(seed) => {
                            setSelected(cell)
                            setEditSeed(seed)
                            setEditing(cell)
                          }}
                          onCommit={(value, direction) =>
                            commit(student, info.activityId!, value, direction)
                          }
                          onCancel={() => {
                            setEditing(null)
                            setEditSeed(undefined)
                          }}
                          onNavigate={move}
                        />
                      </td>
                    )
                  }
                  let value: number | null = null
                  let emphasize = false
                  if (info.kind === 'catpct')
                    value = computeCategoryPercent(
                      structure.activities.filter(
                        (activity) =>
                          activity.category_id === info.categoryId &&
                          activity.grading_period_id === periodId,
                      ),
                      scores,
                      student.id,
                    )
                  if (info.kind === 'periodgrade') {
                    value = computeConfiguredPeriodComponentGrade(
                      structure,
                      scores,
                      student.id,
                      periodId,
                      info.componentId!,
                    )
                    emphasize = true
                  }
                  if (info.kind === 'component') {
                    value = book?.components[info.componentId!] ?? null
                    emphasize = true
                  }
                  if (info.kind === 'final') {
                    value = book?.final ?? null
                    emphasize = true
                  }
                  return (
                    <td
                      key={column.id}
                      className={cn(
                        'whitespace-nowrap border-r border-(--color-border) px-3 py-1.5 text-right tabular-nums',
                        emphasize
                          ? 'font-semibold text-(--color-ink)'
                          : 'text-(--color-ink-muted)',
                        info.kind === 'final' &&
                          'bg-(--color-accent-500)/10 text-(--color-accent-300)',
                      )}
                    >
                      {fmt(value)}
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
