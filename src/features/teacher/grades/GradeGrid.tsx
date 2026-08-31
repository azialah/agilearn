import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { Maximize2, Minimize2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import {
  categoriesFor,
  computeCategoryPercent,
  computeConfiguredPeriodComponentGrade,
  computeConfiguredStudentGradebook,
  computeReportedFinalGrade,
  round2,
  type GradebookStructure,
  type ScoreMap,
  type TransmutationTable,
} from '@/lib/grading'
import { studentFullName, type GradingTemplate, type Student } from '@/types/domain'
import { StudentFormDialog } from '@/features/teacher/classrooms/StudentFormDialog'
import { finalColumnLabel } from './SummaryTable'
import { useUpsertScore } from '@/lib/queries/grades'
import { useToast } from '@/components/ui/toast'
import { useLocale } from '@/lib/locale'
import { ScoreCell } from './ScoreCell'
import { nextCell, parseScoreInput, type CellPos, type NavDirection } from './navigation'

interface LeafInfo {
  kind: 'student' | 'score' | 'catpct' | 'periodgrade' | 'component' | 'final'
  activityId?: string
  categoryId?: string
  componentId?: string
  maxScore?: number
  editIndex?: number
}
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
  gradingTemplate,
  transmutationTable,
  chedIncrement,
}: {
  classroomId: string
  courseSubjectId?: string
  structure: GradebookStructure
  scores: ScoreMap
  students: Student[]
  periodId: string
  focusStudentId?: string
  /** Undefined/'custom' shows the raw computed percentage, unchanged. */
  gradingTemplate?: GradingTemplate
  /** Only consulted for 'basic_education'/'senior_high'. */
  transmutationTable?: TransmutationTable
  /** Only consulted for 'higher_education'. */
  chedIncrement?: number
}) {
  const upsertScore = useUpsertScore()
  // Only used if a write has to be parked offline, where the conflict row shows
  // it verbatim and "Score for student <uuid>" would tell the teacher nothing.
  const scoreLabel = (activityId: string, student: Student) =>
    `${studentFullName(student)} — ${
      structure.activities.find((activity) => activity.id === activityId)?.name ?? ''
    }`.trim()
  const { toast } = useToast()
  const { t } = useLocale()
  const [selected, setSelected] = useState<CellPos>({ row: 0, col: 0 })
  const [editing, setEditing] = useState<CellPos | null>(null)
  const [editSeed, setEditSeed] = useState<string>()
  const [fullScreen, setFullScreen] = useState(false)

  // Escape exits full-screen from anywhere in the grid, matching every other
  // full-screen/overlay surface in the app.
  useEffect(() => {
    if (!fullScreen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFullScreen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [fullScreen])
  const { editableActivities, leafInfo, columns } = useMemo(() => {
    const helper = createColumnHelper<Student>()
    const info = new Map<string, LeafInfo>()
    const editable: { activityId: string; maxScore: number }[] = []
    const cols: ColumnDef<Student, unknown>[] = [
      helper.display({
        id: 'student',
        header: t('gradesStudentColumnHeader'),
      }) as ColumnDef<Student, unknown>,
    ]
    info.set('student', { kind: 'student' })
    for (const component of structure.components) {
      const categories = categoriesFor(structure, periodId, component.id)
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
        helper.display({
          id: gradeId,
          header: t('gradesPeriodGradeColumnHeader', { component: component.name }),
        }) as ColumnDef<Student, unknown>,
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
      helper.display({
        id: 'final',
        header: finalColumnLabel(t, gradingTemplate),
      }) as ColumnDef<Student, unknown>,
    )
    cols.push(
      helper.group({
        id: 'overall',
        header: t('gradesOverallColumnHeader'),
        columns: summary,
      }) as ColumnDef<Student, unknown>,
    )
    return { editableActivities: editable, leafInfo: info, columns: cols }
  }, [structure, periodId, gradingTemplate, t])
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
  // Same "Final" concept as the raw percentage above, converted for display
  // when the subject reports DepEd-transmuted or CHED grades instead. Shares
  // computeReportedFinalGrade with SummaryTable and both exporters so the four
  // cannot disagree about what a student's final actually is.
  const reportedFinals = useMemo(
    () =>
      new Map(
        students.map((student) => [
          student.id,
          computeReportedFinalGrade(structure, scores, student.id, {
            gradingTemplate,
            table: transmutationTable,
            chedIncrement,
          }),
        ]),
      ),
    [students, structure, scores, gradingTemplate, transmutationTable, chedIncrement],
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
    const previous = scores[activityId]?.[student.id] ?? null
    if (previous !== value) {
      upsertScore.mutate(
        {
          classroomId,
          courseSubjectId,
          activityId,
          studentId: student.id,
          score: value,
          label: scoreLabel(activityId, student),
        },
        {
          onError: (error) =>
            toast({
              title: t('gradesScoreSaveErrorToast'),
              description: error instanceof Error ? error.message : undefined,
              tone: 'error',
            }),
        },
      )
      toast({
        title: t('gradesScoreSavedToast', { name: studentFullName(student) }),
        tone: 'success',
        durationMs: 10_000,
        action: {
          label: t('commonUndo'),
          onClick: () =>
            upsertScore.mutate(
              {
                classroomId,
                courseSubjectId,
                activityId,
                studentId: student.id,
                score: previous,
                label: scoreLabel(activityId, student),
              },
              {
                onSuccess: () =>
                  toast({
                    title: t('gradesScoreRestoredToast', {
                      name: studentFullName(student),
                    }),
                    tone: 'success',
                  }),
                onError: (error) =>
                  toast({
                    title: t('gradesUndoErrorToast'),
                    description: error instanceof Error ? error.message : undefined,
                    tone: 'error',
                  }),
              },
            ),
        },
      })
    }
    setEditing(null)
    setEditSeed(undefined)
    if (direction) move(direction)
  }
  /** A range paste from an actual spreadsheet (TSV, tab-separated cells,
   * newline-separated rows), filling from the selected cell. Only fires
   * while a cell is selected but not mid-edit — a single value pasted into
   * an open editor already works via the browser's native input paste. */
  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    if (editing) return
    const text = event.clipboardData.getData('text/plain')
    if (!text) return
    event.preventDefault()
    const rows = text
      .replace(/\r/g, '')
      .split('\n')
      .filter((row) => row.length > 0)
      .map((row) => row.split('\t'))
    let applied = 0
    let skipped = 0
    rows.forEach((row, rowOffset) => {
      const student = students[selected.row + rowOffset]
      if (!student) {
        skipped += row.length
        return
      }
      row.forEach((raw, colOffset) => {
        const activity = editableActivities[selected.col + colOffset]
        if (!activity) {
          skipped += 1
          return
        }
        const result = parseScoreInput(raw, activity.maxScore)
        if (!result.ok) {
          skipped += 1
          return
        }
        if ((scores[activity.activityId]?.[student.id] ?? null) !== result.value) {
          upsertScore.mutate({
            classroomId,
            courseSubjectId,
            activityId: activity.activityId,
            studentId: student.id,
            score: result.value,
            label: scoreLabel(activity.activityId, student),
          })
        }
        applied += 1
      })
    })
    toast({
      title:
        skipped > 0
          ? t('gradesPasteAppliedSkippedToast', { applied, skipped })
          : t('gradesPasteAppliedToast', { applied }),
      description: skipped > 0 ? t('gradesPasteSkippedDescription') : undefined,
      tone: skipped > 0 ? 'error' : 'success',
    })
  }
  const leaves = table.getAllLeafColumns()
  const grid = (
    <div
      className={cn(
        'scrollbar-thin overflow-x-auto rounded-lg border border-(--color-border)',
        fullScreen && 'max-h-[calc(100vh-8rem)]',
      )}
      onPaste={handlePaste}
    >
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
                      <td key={column.id} className={cn(STICKY, 'whitespace-nowrap p-0')}>
                        <StudentFormDialog
                          classroomId={classroomId}
                          student={student}
                          trigger={
                            <button
                              type="button"
                              className="flex w-full flex-col items-start px-3 py-1.5 text-left hover:bg-(--color-surface-2)"
                            >
                              <span className="font-medium">
                                {studentFullName(student)}
                              </span>
                              {student.student_no && (
                                <span className="text-xs text-(--color-ink-faint)">
                                  {student.student_no}
                                </span>
                              )}
                            </button>
                          }
                        />
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
                    // structure.policy makes this column show the same
                    // "tab. score" the teacher's own sheet shows, rather than
                    // an unfloored percentage the totals below would not match.
                    value = computeCategoryPercent(
                      structure.activities.filter(
                        (activity) =>
                          activity.category_id === info.categoryId &&
                          activity.grading_period_id === periodId,
                      ),
                      scores,
                      student.id,
                      structure.policy,
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
                    value = reportedFinals.get(student.id) ?? null
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

  const toggleButton = (
    <button
      type="button"
      onClick={() => setFullScreen((current) => !current)}
      className="inline-flex items-center gap-1.5 rounded-full border border-(--color-border) bg-(--color-surface-1) px-3 py-1.5 text-xs font-medium text-(--color-ink-muted) transition-colors hover:bg-(--color-surface-2) hover:text-(--color-ink)"
    >
      {fullScreen ? (
        <Minimize2 className="size-3.5" aria-hidden />
      ) : (
        <Maximize2 className="size-3.5" aria-hidden />
      )}
      {fullScreen ? t('gradesExitFullScreenButton') : t('gradesFullScreenButton')}
    </button>
  )

  if (fullScreen) {
    return createPortal(
      <div className="fixed inset-0 z-100 flex flex-col gap-3 overflow-auto bg-(--color-surface-0) p-4">
        <div className="flex justify-end">{toggleButton}</div>
        {grid}
      </div>,
      document.body,
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end">{toggleButton}</div>
      {grid}
    </div>
  )
}
