import { useMemo, useRef, useState, type ReactNode } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { Table, TableContainer, TBody, TD, TH, THead, TR } from '@/components/ui/Table'
import { useToast } from '@/components/ui/toast'
import { useStudents } from '@/lib/queries/students'
import { usePostedGrades, useUpsertPostedGrades } from '@/lib/queries/postedGrades'
import { useCourseSubjects } from '@/lib/queries/academicWorkspace'
import { useSubjectGradeCombinations, useSubjectGradebooks } from '@/lib/queries/grades'
import { readSheetMatrix } from '@/features/teacher/io/readSheet'
import { findLecLabPair } from '@/features/teacher/io/lecLabPair'
import { useCommitClassRecordImport } from '@/features/teacher/io/classRecordMutations'
import type { ImportPlan } from '@/features/teacher/io/classRecordPlan'
import type { PostedGradeInsert } from '@/types/domain'
import {
  planPostedGradebook,
  termCategoryName,
  type GradebookSide,
} from './gradebookWrite'
import {
  parsePostedGrades,
  termFromHeader,
  type ParsedPostedSheet,
} from './parsePostedGrades'

interface Props {
  classroomId: string
  courseSubjectId: string
  subjectName: string
  trigger: ReactNode
}

const ACCEPT = '.xlsx,.xls,.csv'

function fmt(value: number | null): string {
  return value === null ? '—' : value.toFixed(2)
}

export function PostedGradesImportDialog({
  classroomId,
  courseSubjectId,
  subjectName,
  trigger,
}: Props) {
  const { toast } = useToast()
  const students = useStudents(classroomId)
  const posted = usePostedGrades(classroomId)
  const upsert = useUpsertPostedGrades()
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [sheet, setSheet] = useState<ParsedPostedSheet | null>(null)
  const [term, setTerm] = useState('Midterm')
  const [overwrite, setOverwrite] = useState(true)
  const [reading, setReading] = useState(false)
  const [readError, setReadError] = useState<string | null>(null)
  const [writeGradebook, setWriteGradebook] = useState(true)
  const [committing, setCommitting] = useState(false)

  // Where the Lecture and Laboratory columns go in the gradebook: the
  // Lecture + Laboratory pair when there is one, else the active subject's side.
  const subjects = useCourseSubjects(classroomId)
  const combinations = useSubjectGradeCombinations(classroomId)
  const targets = useMemo(() => {
    const list = subjects.data ?? []
    const pair = findLecLabPair(list, courseSubjectId, combinations.data ?? [])
    if (pair)
      return [
        { side: 'lecture' as const, subjectId: pair.lecture.id, name: pair.lecture.name },
        {
          side: 'laboratory' as const,
          subjectId: pair.laboratory.id,
          name: pair.laboratory.name,
        },
      ]
    const active = list.find((row) => row.id === courseSubjectId)
    return active && (active.kind === 'lecture' || active.kind === 'laboratory')
      ? [{ side: active.kind as GradebookSide, subjectId: active.id, name: active.name }]
      : []
  }, [subjects.data, combinations.data, courseSubjectId])
  const targetIds = useMemo(() => targets.map((target) => target.subjectId), [targets])
  const books = useSubjectGradebooks(classroomId, targetIds)
  const commitGradebook = useCommitClassRecordImport()

  const reset = () => {
    setFileName(null)
    setSheet(null)
    setTerm('Midterm')
    setOverwrite(true)
    setReadError(null)
    setWriteGradebook(true)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleFile = async (file: File) => {
    setReading(true)
    setReadError(null)
    try {
      const matrix = await readSheetMatrix(file)
      const parsed = parsePostedGrades(matrix, students.data ?? [])
      setFileName(file.name)
      setSheet(parsed)
      setTerm(termFromHeader(parsed.gradeHeader))
    } catch (error) {
      setReadError(error instanceof Error ? error.message : 'Could not read that file.')
      setSheet(null)
    } finally {
      setReading(false)
    }
  }

  const trimmedTerm = term.trim()
  const alreadyPosted = useMemo(
    () =>
      new Set(
        (posted.data ?? [])
          .filter(
            (row) =>
              row.course_subject_id === courseSubjectId && row.term === trimmedTerm,
          )
          .map((row) => row.student_id),
      ),
    [posted.data, courseSubjectId, trimmedTerm],
  )

  const rows = sheet?.rows ?? []
  const matched = rows.filter((row) => row.status === 'matched')
  const toWrite = matched.filter(
    (row) => row.studentId && (overwrite || !alreadyPosted.has(row.studentId)),
  )
  const unmatched = rows.filter((row) => row.status === 'unmatched').length
  const invalid = rows.filter((row) => row.status === 'error').length
  const mismatches = matched.filter((row) => row.mismatch).length

  // One plan per subject, built by the class-record planner — so the preview
  // below is exactly what gets written.
  const gradebookPlans = useMemo(() => {
    if (!sheet || !trimmedTerm || !students.data) return []
    return targets.flatMap((target) => {
      const book = books.gradebooks.get(target.subjectId)
      if (!book) return []
      const plan = planPostedGradebook(
        sheet.rows,
        { students: students.data ?? [], structure: book.structure, scores: book.scores },
        trimmedTerm,
        target.side,
        overwrite,
      )
      return plan ? [{ ...target, plan }] : []
    })
  }, [sheet, trimmedTerm, students.data, targets, books.gradebooks, overwrite])
  const gradebookLoading = targets.length > 0 && books.isLoading
  const gradebookBlocked =
    writeGradebook &&
    gradebookPlans.some(({ plan }) =>
      plan.issues.some((issue) => issue.level === 'error'),
    )

  const commit = async () => {
    if (!trimmedTerm || toWrite.length === 0) return
    const payload: PostedGradeInsert[] = toWrite.flatMap((row) =>
      row.studentId
        ? [
            {
              classroom_id: classroomId,
              course_subject_id: courseSubjectId,
              student_id: row.studentId,
              term: trimmedTerm,
              lecture: row.lecture,
              laboratory: row.laboratory,
              term_grade: row.termGrade,
            },
          ]
        : [],
    )
    setCommitting(true)
    try {
      await upsert.mutateAsync({ classroomId, rows: payload })
    } catch (error) {
      toast({
        title: 'Could not post grades',
        description: error instanceof Error ? error.message : String(error),
        tone: 'error',
      })
      setCommitting(false)
      return
    }
    const written: string[] = []
    if (writeGradebook) {
      for (const { subjectId, name, plan } of gradebookPlans) {
        if (plan.scores.length === 0 && !hasStructureChanges(plan)) continue
        try {
          await commitGradebook.mutateAsync({
            classroomId,
            courseSubjectId: subjectId,
            plan,
          })
          written.push(name)
        } catch (error) {
          // The posted grades are saved; say exactly which gradebook did not
          // update rather than reporting the whole import as failed.
          toast({
            title: `Posted grades saved, but the ${name} gradebook did not update`,
            description: error instanceof Error ? error.message : String(error),
            tone: 'error',
          })
          setCommitting(false)
          return
        }
      }
    }
    toast({
      title: `Posted ${payload.length} ${trimmedTerm} grade${payload.length === 1 ? '' : 's'}`,
      description: written.length
        ? `${subjectName} · gradebook updated for ${written.join(' and ')}`
        : subjectName,
      tone: 'success',
    })
    setCommitting(false)
    reset()
    setOpen(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import posted grades</DialogTitle>
          <DialogDescription>
            Upload a .xlsx or .csv with the columns Last Name, First Name, SchoolID,
            Lecture, Laboratory and Midterm Grade. Grades are saved for {subjectName}{' '}
            exactly as written; a blank Midterm Grade is filled in as Lecture × 40% +
            Laboratory × 60%.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={inputRef}
              id="posted-grades-file"
              type="file"
              accept={ACCEPT}
              aria-label="Grades file"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void handleFile(file)
              }}
            />
            <Button
              type="button"
              variant="outline"
              disabled={reading || students.isLoading}
              onClick={() => inputRef.current?.click()}
            >
              {reading ? <Spinner className="size-4" /> : null}
              {fileName ? 'Choose another file' : 'Choose file'}
            </Button>
            {fileName && (
              <span className="truncate text-sm text-(--color-ink-muted)">
                {fileName}
              </span>
            )}
          </div>

          {readError && (
            <p role="alert" className="text-sm text-(--color-danger)">
              {readError}
            </p>
          )}

          {sheet && (
            <>
              {sheet.errors.length > 0 && (
                <ul className="space-y-1 text-sm text-(--color-warning)">
                  {sheet.errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field
                  label="Term"
                  htmlFor="posted-grades-term"
                  hint="Shown in the slideshow and the email, e.g. Midterm, Finals."
                >
                  <Input
                    id="posted-grades-term"
                    value={term}
                    maxLength={40}
                    onChange={(event) => setTerm(event.target.value)}
                  />
                </Field>
                <label className="flex items-start gap-2 pt-7 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={overwrite}
                    onChange={(event) => setOverwrite(event.target.checked)}
                  />
                  <span>
                    Replace grades already posted for this term
                    {alreadyPosted.size > 0 && (
                      <span className="text-(--color-ink-faint)">
                        {' '}
                        ({alreadyPosted.size} on file)
                      </span>
                    )}
                  </span>
                </label>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                <Badge tone="success">{matched.length} matched</Badge>
                {unmatched > 0 && <Badge tone="warning">{unmatched} not on roster</Badge>}
                {invalid > 0 && <Badge tone="danger">{invalid} with errors</Badge>}
                {mismatches > 0 && (
                  <Badge tone="warning">
                    {mismatches} where the grade ≠ Lecture × 40% + Laboratory × 60%
                  </Badge>
                )}
              </div>

              <TableContainer className="max-h-80 overflow-y-auto">
                <Table>
                  <THead>
                    <TR>
                      <TH>Row</TH>
                      <TH>Student</TH>
                      <TH>SchoolID</TH>
                      <TH className="text-right">Lecture</TH>
                      <TH className="text-right">Laboratory</TH>
                      <TH className="text-right">{trimmedTerm || 'Term'} Grade</TH>
                      <TH>Status</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {rows.map((row) => (
                      <TR key={row.row}>
                        <TD className="text-(--color-ink-faint)">{row.row}</TD>
                        <TD>
                          {row.lastName}, {row.firstName}
                        </TD>
                        <TD className="tabular-nums">{row.studentNo || '—'}</TD>
                        <TD className="text-right tabular-nums">{fmt(row.lecture)}</TD>
                        <TD className="text-right tabular-nums">{fmt(row.laboratory)}</TD>
                        <TD className="text-right tabular-nums">
                          {fmt(row.termGrade)}
                          {row.termGradeComputed && (
                            <span className="text-(--color-ink-faint)"> *</span>
                          )}
                        </TD>
                        <TD>
                          {row.status === 'error' ? (
                            <span className="text-xs text-(--color-danger)">
                              {row.errors.join('; ')}
                            </span>
                          ) : row.status === 'unmatched' ? (
                            <Badge tone="warning">Not on roster</Badge>
                          ) : row.mismatch ? (
                            <Badge tone="warning">Check grade</Badge>
                          ) : row.studentId && alreadyPosted.has(row.studentId) ? (
                            <Badge tone="neutral">{overwrite ? 'Replace' : 'Keep'}</Badge>
                          ) : (
                            <Badge tone="success">
                              {row.matchedBy === 'name' ? 'Matched by name' : 'Ready'}
                            </Badge>
                          )}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </TableContainer>
              {rows.some((row) => row.termGradeComputed) && (
                <p className="text-xs text-(--color-ink-faint)">
                  * Computed as Lecture × 40% + Laboratory × 60% because the sheet left it
                  blank.
                </p>
              )}

              {targets.length > 0 && (
                <div className="space-y-2 rounded-md border border-(--color-border) p-3">
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={writeGradebook}
                      onChange={(event) => setWriteGradebook(event.target.checked)}
                    />
                    <span>
                      Also write to the gradebook
                      <span className="block text-xs text-(--color-ink-faint)">
                        Each grade is stored as one “{trimmedTerm || 'Term'} grade”
                        activity out of 100, so the grade sheet export and gradebook
                        slides show the same Lecture and Laboratory numbers.
                      </span>
                    </span>
                  </label>
                  {writeGradebook &&
                    (gradebookLoading ? (
                      <p className="text-xs text-(--color-ink-muted)">
                        Loading gradebooks…
                      </p>
                    ) : (
                      <ul className="space-y-2 text-xs">
                        {gradebookPlans.map(({ side, name, plan }) => (
                          <li key={side} className="space-y-0.5">
                            <p className="font-medium text-(--color-ink)">
                              {name}{' '}
                              <span className="text-(--color-ink-faint)">
                                ({side === 'lecture' ? 'Lecture' : 'Laboratory'})
                              </span>
                            </p>
                            <p className="text-(--color-ink-muted)">
                              {describePlan(plan, side)}
                            </p>
                            {plan.issues.map((issue) => (
                              <p
                                key={issue.message}
                                className={
                                  issue.level === 'error'
                                    ? 'text-(--color-danger)'
                                    : 'text-(--color-warning)'
                                }
                              >
                                {issue.message}
                              </p>
                            ))}
                          </li>
                        ))}
                      </ul>
                    ))}
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={
              !trimmedTerm ||
              toWrite.length === 0 ||
              committing ||
              gradebookBlocked ||
              (writeGradebook && gradebookLoading)
            }
            onClick={() => void commit()}
          >
            {committing ? <Spinner className="size-4" /> : null}
            Post {toWrite.length} grade{toWrite.length === 1 ? '' : 's'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function hasStructureChanges(plan: ImportPlan): boolean {
  return (
    plan.periods.length > 0 ||
    plan.categories.length > 0 ||
    plan.activities.create.length > 0
  )
}

/** "+ Midterm period · + “Term grade (Laboratory)” · + 1 activity · 25 scores" */
function describePlan(plan: ImportPlan, side: GradebookSide): string {
  const parts = [
    ...plan.periods.map((period) => `+ ${period.name} period`),
    ...plan.categories.map(() => `+ “${termCategoryName(side)}” category`),
    ...(plan.activities.create.length
      ? [`+ ${plan.activities.create.length} activity`]
      : []),
    `${plan.counts.newScores} new score${plan.counts.newScores === 1 ? '' : 's'}`,
  ]
  if (plan.counts.overwrites) parts.push(`${plan.counts.overwrites} replaced`)
  if (plan.counts.keptExisting) parts.push(`${plan.counts.keptExisting} kept as is`)
  if (plan.counts.unchanged) parts.push(`${plan.counts.unchanged} unchanged`)
  return parts.join(' · ')
}
