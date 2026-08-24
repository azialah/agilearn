import { useMemo, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
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
import { Badge, type BadgeTone } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { useToast } from '@/components/ui/toast'
import { useBulkUpsertAttendance, useSessionRecords } from '@/lib/queries/attendance'
import { useProfile } from '@/lib/queries/profiles'
import { useLocale } from '@/lib/locale'
import { cn } from '@/lib/cn'
import {
  studentFullName,
  type AttendanceRecordInsert,
  type Student,
} from '@/types/domain'
import { getStatusMeta } from './status'
import {
  parseAttendanceImport,
  planFromResult,
  type AttendanceImportResult,
} from './participantsImport'

export interface AttendanceImportButtonProps {
  sessionId: string
  classroomId: string
  students: Student[]
  /** Lets a session row supply its own control instead of the default button. */
  trigger?: ReactNode
}

const UNASSIGNED = ''

/** A real Meet participants export is a few KB; past this it is the wrong file. */
const MAX_FILE_BYTES = 2_000_000

type Filter = 'all' | 'review' | 'present' | 'absent' | 'recorded'

/** A checkbox key that stays stable as filters change the rendered order. */
const presentKey = (studentId: string) => `p:${studentId}`
const reviewKey = (index: number) => `r:${index}`
const absentKey = (studentId: string) => `a:${studentId}`

/**
 * Trigger only — deliberately holds no query hooks.
 *
 * One of these mounts per session row on the attendance page, so anything
 * fetched here would fire once per session on page load: a term with sixty
 * sessions issued sixty `attendance_records` selects for a button that is
 * hidden until you hover it. The body, and every hook in it, mounts on open.
 */
export function AttendanceImportButton({
  trigger,
  ...rest
}: AttendanceImportButtonProps) {
  const { t } = useLocale()
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            {t('attendanceImportButton')}
          </Button>
        )}
      </DialogTrigger>
      {/* Unmounting on close is also what resets the form — there is no reset()
          to keep in sync with the fields. */}
      {open && <ImportDialogBody {...rest} onClose={() => setOpen(false)} />}
    </Dialog>
  )
}

function ImportDialogBody({
  sessionId,
  classroomId,
  students,
  onClose,
}: Omit<AttendanceImportButtonProps, 'trigger'> & { onClose: () => void }) {
  const { toast } = useToast()
  const { t } = useLocale()
  const { data: profile } = useProfile()
  const { data: records } = useSessionRecords(sessionId)
  const bulkUpsert = useBulkUpsertAttendance(sessionId, classroomId)

  const [fileName, setFileName] = useState<string | null>(null)
  const [parsing, setParsing] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [result, setResult] = useState<AttendanceImportResult | null>(null)
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [assignments, setAssignments] = useState<Record<number, string>>({})
  const [filter, setFilter] = useState<Filter>('all')
  const inputRef = useRef<HTMLInputElement>(null)

  const studentById = useMemo(
    () => new Map(students.map((student) => [student.id, student])),
    [students],
  )
  const recordByStudent = useMemo(
    () => new Map((records ?? []).map((record) => [record.student_id, record])),
    [records],
  )
  const statusMeta = getStatusMeta(t)

  const plan = useMemo(
    () =>
      result
        ? planFromResult(result, students, [...recordByStudent.keys()])
        : { present: [], absent: [], alreadyRecorded: [] },
    [result, students, recordByStudent],
  )

  /** File rows split by what the teacher has to do with them. */
  const groups = useMemo(() => {
    const rows = (result?.rows ?? []).map((row, index) => ({ ...row, index }))
    const willBePresent = new Set(plan.present)
    return {
      // Matched to a student who has no record yet — nothing to decide. The id
      // is lifted out here so the render never has to assert it is non-null.
      present: rows.flatMap((row) =>
        row.matchedStudentId && willBePresent.has(row.matchedStudentId)
          ? [{ ...row, studentId: row.matchedStudentId }]
          : [],
      ),
      // Ambiguous or unrecognised: needs a student picked before it can be saved.
      review: rows.filter(
        (row) => row.outcome === 'ambiguous' || row.outcome === 'unmatched',
      ),
      teacher: rows.filter((row) => row.outcome === 'teacher'),
    }
  }, [result, plan])

  async function handleFile(file: File) {
    // Both the picker and the drop target funnel through here, which is the only
    // place this can be enforced: `accept=".txt"` is a picker hint the drop path
    // never sees. A real export is a few KB, so anything past 2 MB is a mistake
    // or a wrong file — and reading it would freeze the tab, since parsing runs
    // on the main thread.
    if (file.size > MAX_FILE_BYTES || !file.name.toLowerCase().endsWith('.txt')) {
      toast({ title: t('attendanceImportFileRejected'), tone: 'error' })
      return
    }
    setParsing(true)
    setFileName(file.name)
    setResult(null)
    try {
      const text = await file.text()
      const parsed = parseAttendanceImport(text, students, {
        teacherName: profile?.full_name,
      })
      // Seeded here rather than in an effect on `plan`: a background refetch of
      // the session records would otherwise recompute `plan` and wipe whatever
      // the teacher had already ticked or assigned.
      const initial = planFromResult(parsed, students, [...recordByStudent.keys()])
      setChecked({
        ...Object.fromEntries(initial.present.map((id) => [presentKey(id), true])),
        ...Object.fromEntries(initial.absent.map((id) => [absentKey(id), true])),
      })
      setAssignments({})
      setFilter('all')
      setResult(parsed)
    } catch (error) {
      toast({
        title: t('attendanceImportReadFileError'),
        description: error instanceof Error ? error.message : undefined,
        tone: 'error',
      })
      setFileName(null)
      setResult(null)
    } finally {
      setParsing(false)
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (file) void handleFile(file)
  }

  function toggle(key: string) {
    setChecked((current) => ({ ...current, [key]: !current[key] }))
  }

  /**
   * What will actually be written.
   *
   * `present` is a Set and `absent` excludes everything in it, so one student can
   * never be sent twice — the duplicate (session_id, student_id) that Postgres
   * rejects with 21000. Already-recorded students are filtered again here rather
   * than trusted to the picker, because this is the list that reaches the server.
   */
  const selection = useMemo(() => {
    const present = new Set<string>()
    for (const id of plan.present) if (checked[presentKey(id)]) present.add(id)
    for (const row of groups.review) {
      const studentId = assignments[row.index]
      if (studentId && !recordByStudent.has(studentId) && checked[reviewKey(row.index)])
        present.add(studentId)
    }
    const absent = plan.absent.filter((id) => checked[absentKey(id)] && !present.has(id))
    return { present: [...present], absent }
  }, [plan, groups, checked, assignments, recordByStudent])

  const totalToWrite = selection.present.length + selection.absent.length

  async function handleSave() {
    const inserts: AttendanceRecordInsert[] = [
      ...selection.present.map((studentId) => ({
        studentId,
        status: 'present' as const,
      })),
      ...selection.absent.map((studentId) => ({ studentId, status: 'absent' as const })),
    ].map(({ studentId, status }) => ({
      session_id: sessionId,
      student_id: studentId,
      status,
      // Entry / total time are deliberately dropped, so there is nothing to put
      // here — and nothing already recorded to overwrite, since already-marked
      // students never reach this list.
      remarks: '',
    }))
    if (inserts.length === 0) return

    try {
      await bulkUpsert.mutateAsync(inserts)
      toast({
        title: t('attendanceImportSavedToast', {
          present: selection.present.length,
          absent: selection.absent.length,
        }),
        tone: 'success',
      })
      onClose()
    } catch (error) {
      toast({
        title: t('attendanceImportError'),
        description: error instanceof Error ? error.message : undefined,
        tone: 'error',
      })
    }
  }

  const confirmDescription =
    t('attendanceImportConfirmSummary', {
      present: selection.present.length,
      absent: selection.absent.length,
    }) +
    (plan.alreadyRecorded.length > 0
      ? t('attendanceImportConfirmSkipped', { n: plan.alreadyRecorded.length })
      : '') +
    (typeof navigator !== 'undefined' && !navigator.onLine
      ? t('attendanceImportConfirmOffline')
      : '')

  const counts = {
    all:
      groups.present.length +
      groups.review.length +
      plan.absent.length +
      plan.alreadyRecorded.length,
    review: groups.review.length,
    present: groups.present.length,
    absent: plan.absent.length,
    recorded: plan.alreadyRecorded.length,
  }
  const shows = (section: Filter) => filter === 'all' || filter === section

  return (
    <DialogContent className="max-w-3xl">
      <DialogHeader>
        <DialogTitle>{t('attendanceImportDialogTitle')}</DialogTitle>
        <DialogDescription>
          {t('attendanceImportDescPrefix')}
          <a
            href="https://trackit.visualbrahma.tech/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-(--color-accent-350) underline underline-offset-2"
          >
            {t('attendanceImportTrackItLabel')}
          </a>
          {t('attendanceImportDescSuffix')}
        </DialogDescription>
      </DialogHeader>

      <input
        ref={inputRef}
        type="file"
        accept=".txt"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleFile(file)
        }}
      />

      <div
        role="button"
        tabIndex={0}
        // Once a file is chosen the visible text becomes its name, so the
        // control needs a name of its own that does not move under the user.
        aria-label={t('attendanceImportClickToBrowse')}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' && e.key !== ' ') return
          e.preventDefault()
          inputRef.current?.click()
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg',
          'border border-dashed px-6 py-8 text-center transition-colors',
          dragging
            ? 'border-(--color-accent-400) bg-(--color-accent-500)/10'
            : 'border-(--color-border-strong) hover:bg-(--color-surface-1)',
        )}
      >
        <p className="text-sm text-(--color-ink)">
          {fileName ? (
            <span className="font-medium">{fileName}</span>
          ) : (
            <>
              <span className="font-medium">{t('attendanceImportClickToBrowse')}</span>
              {t('attendanceImportOrDragHere')}
            </>
          )}
        </p>
        <p className="text-xs text-(--color-ink-faint)">.txt</p>
      </div>

      {/* Stated up front, not buried in a tooltip: the file carries join times
            and the teacher should know none of it is being stored. */}
      <p className="text-xs text-(--color-ink-muted)">
        {t('attendanceImportTimingHint')}
      </p>

      {parsing && (
        <div className="flex items-center gap-2 text-sm text-(--color-ink-muted)">
          <Spinner className="size-4" /> {t('attendanceImportReadingFile')}
        </div>
      )}

      <AnimatePresence>
        {result && !parsing && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <div
              role="group"
              aria-label={t('attendanceImportFilterLabel')}
              className="flex flex-wrap items-center gap-1.5"
            >
              <FilterChip
                active={filter === 'all'}
                onSelect={() => setFilter('all')}
                label={t('attendanceImportFilterAll', { n: counts.all })}
              />
              {counts.review > 0 && (
                <FilterChip
                  active={filter === 'review'}
                  onSelect={() => setFilter('review')}
                  label={t('attendanceImportFilterReview', { n: counts.review })}
                  tone="warning"
                />
              )}
              <FilterChip
                active={filter === 'present'}
                onSelect={() => setFilter('present')}
                label={t('attendanceImportFilterPresent', { n: counts.present })}
              />
              <FilterChip
                active={filter === 'absent'}
                onSelect={() => setFilter('absent')}
                label={t('attendanceImportFilterAbsent', { n: counts.absent })}
              />
              {counts.recorded > 0 && (
                <FilterChip
                  active={filter === 'recorded'}
                  onSelect={() => setFilter('recorded')}
                  label={t('attendanceImportFilterRecorded', { n: counts.recorded })}
                />
              )}
            </div>

            <div className="max-h-80 space-y-4 overflow-y-auto pr-1">
              {counts.all === 0 && (
                <p className="text-sm text-(--color-ink-muted)">
                  {t('attendanceImportNoParticipants')}
                </p>
              )}

              {/* Anything needing a decision leads, so it cannot be scrolled
                    past on a forty-row roster. */}
              {shows('review') && groups.review.length > 0 && (
                <Section title={t('attendanceImportReviewHeading')}>
                  {groups.review.map((row) => {
                    const assigned = assignments[row.index] ?? UNASSIGNED
                    // Already-recorded students are not offered here. Picking
                    // one would write over a status the teacher set by hand,
                    // which is the single rule this dialog promises not to
                    // break — so the option simply does not exist.
                    const options = (
                      row.candidateIds.length
                        ? row.candidateIds
                            .map((id) => studentById.get(id))
                            .filter((s): s is Student => !!s)
                        : students
                    ).filter((student) => !recordByStudent.has(student.id))
                    return (
                      <Row
                        key={reviewKey(row.index)}
                        id={reviewKey(row.index)}
                        name={row.rawNames[0]}
                        detail={detailFor(row.rawNames, row.occurrences, t)}
                        checked={!!checked[reviewKey(row.index)]}
                        disabled={!assigned}
                        onToggle={() => toggle(reviewKey(row.index))}
                        badge={{
                          tone: row.outcome === 'ambiguous' ? 'warning' : 'neutral',
                          label:
                            row.outcome === 'ambiguous'
                              ? t('attendanceImportAmbiguous')
                              : t('attendanceImportUnmatched'),
                        }}
                      >
                        <Select
                          value={assigned}
                          onValueChange={(value) => {
                            setAssignments((current) => ({
                              ...current,
                              [row.index]: value,
                            }))
                            setChecked((current) => ({
                              ...current,
                              [reviewKey(row.index)]: !!value,
                            }))
                          }}
                        >
                          <SelectTrigger
                            className="w-56"
                            aria-label={t('attendanceImportAssignAriaLabel', {
                              name: row.rawNames[0],
                            })}
                          >
                            <SelectValue
                              placeholder={t('attendanceImportAssignToPlaceholder')}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {options.map((student) => (
                              <SelectItem key={student.id} value={student.id}>
                                {studentFullName(student)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Row>
                    )
                  })}
                </Section>
              )}

              {shows('present') && groups.present.length > 0 && (
                <Section title={t('attendanceImportPresentHeading')}>
                  {groups.present.map((row) => {
                    const student = studentById.get(row.studentId)
                    return (
                      <Row
                        key={presentKey(row.studentId)}
                        id={presentKey(row.studentId)}
                        name={student ? studentFullName(student) : row.rawNames[0]}
                        detail={detailFor(row.rawNames, row.occurrences, t)}
                        checked={!!checked[presentKey(row.studentId)]}
                        onToggle={() => toggle(presentKey(row.studentId))}
                        badge={{
                          tone: 'success',
                          label: t('attendanceImportMatched'),
                        }}
                      />
                    )
                  })}
                </Section>
              )}

              {shows('absent') && plan.absent.length > 0 && (
                <Section title={t('attendanceImportAbsentHeading')}>
                  {plan.absent.map((id) => {
                    const student = studentById.get(id)
                    return (
                      <Row
                        key={absentKey(id)}
                        id={absentKey(id)}
                        name={student ? studentFullName(student) : id}
                        checked={!!checked[absentKey(id)]}
                        onToggle={() => toggle(absentKey(id))}
                        badge={{
                          tone: 'danger',
                          label: statusMeta.absent.label,
                        }}
                      />
                    )
                  })}
                </Section>
              )}

              {shows('recorded') && plan.alreadyRecorded.length > 0 && (
                <Section title={t('attendanceImportRecordedHeading')}>
                  {plan.alreadyRecorded.map((id) => {
                    const student = studentById.get(id)
                    const status = recordByStudent.get(id)?.status
                    return (
                      <div
                        key={id}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-(--color-ink-muted)"
                      >
                        <span className="min-w-0 flex-1 truncate">
                          {student ? studentFullName(student) : id}
                        </span>
                        {status && (
                          <Badge tone="neutral">
                            {t('attendanceImportAlreadyRecordedNote', {
                              status: statusMeta[status].label,
                            })}
                          </Badge>
                        )}
                      </div>
                    )
                  })}
                </Section>
              )}

              {filter === 'all' &&
                groups.teacher.map((row) => (
                  <p
                    key={reviewKey(row.index)}
                    className="rounded-lg bg-(--color-surface-2) px-3 py-2 text-sm text-(--color-ink)"
                  >
                    <span className="font-medium">{row.rawNames[0]}</span>{' '}
                    <Badge tone="accent">{t('attendanceImportTeacherBadge')}</Badge>{' '}
                    <span className="text-(--color-ink-muted)">
                      {t('attendanceImportTeacherNote')}
                    </span>
                  </p>
                ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          {t('commonCancel')}
        </Button>
        <ConfirmDialog
          title={t('attendanceImportConfirmTitle')}
          description={confirmDescription}
          confirmLabel={t('attendanceImportSaveButton')}
          confirmVariant="primary"
          onConfirm={handleSave}
          trigger={
            <Button loading={bulkUpsert.isPending} disabled={totalToWrite === 0}>
              {t('attendanceImportSaveButton')}
            </Button>
          }
        />
      </DialogFooter>
    </DialogContent>
  )
}

/** "Also spelled X" / "n entries merged" — only when the file said it twice. */
function detailFor(
  rawNames: string[],
  occurrences: number,
  t: ReturnType<typeof useLocale>['t'],
): string | undefined {
  if (rawNames.length > 1) {
    return t('attendanceImportAlsoSpelled', { names: rawNames.slice(1).join(', ') })
  }
  if (occurrences > 1) return t('attendanceImportEntriesMerged', { n: occurrences })
  return undefined
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-1">
      <h3 className="px-3 text-xs font-medium uppercase tracking-wide text-(--color-ink-faint)">
        {title}
      </h3>
      <div className="space-y-1">{children}</div>
    </section>
  )
}

function FilterChip({
  active,
  label,
  onSelect,
  tone,
}: {
  active: boolean
  label: string
  onSelect: () => void
  tone?: 'warning'
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onSelect}
      className={cn(
        'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent-400)',
        active
          ? 'border-(--color-accent-400) bg-(--color-accent-500)/15 text-(--color-ink)'
          : 'border-(--color-border) text-(--color-ink-muted) hover:bg-(--color-surface-2) hover:text-(--color-ink)',
        tone === 'warning' && !active && 'border-(--color-warning)/40',
      )}
    >
      {label}
    </button>
  )
}

function Row({
  id,
  name,
  detail,
  checked,
  disabled,
  onToggle,
  badge,
  children,
}: {
  id: string
  name: string
  detail?: string
  checked: boolean
  disabled?: boolean
  onToggle: () => void
  badge: { tone: BadgeTone; label: string }
  children?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg px-3 py-2 hover:bg-(--color-surface-1)">
      <input
        id={`import-${id}`}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onToggle}
        className="size-4 shrink-0 accent-(--color-accent-400) disabled:opacity-40"
      />
      <label htmlFor={`import-${id}`} className="min-w-0 flex-1 cursor-pointer text-sm">
        <span className="block truncate text-(--color-ink)">{name}</span>
        {detail && (
          <span className="block truncate text-xs text-(--color-ink-faint)">
            {detail}
          </span>
        )}
      </label>
      <Badge tone={badge.tone}>{badge.label}</Badge>
      {children}
    </div>
  )
}
