import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Send } from 'lucide-react'
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
import { Label } from '@/components/ui/Label'
import { Spinner } from '@/components/ui/Spinner'
import { Table, TableContainer, TBody, TD, TH, THead, TR } from '@/components/ui/Table'
import { useToast } from '@/components/ui/toast'
import { useClassroom, useUpdateClassroom } from '@/lib/queries/classrooms'
import { useCourseSubjects } from '@/lib/queries/academicWorkspace'
import { useStudents } from '@/lib/queries/students'
import { useProfile } from '@/lib/queries/profiles'
import {
  useGradeEmailLog,
  usePostedGrades,
  useSendGradeEmails,
} from '@/lib/queries/postedGrades'
import {
  gradeEmailSubject,
  gradeEmailText,
  MAX_COPY_RECIPIENTS,
  normalizeEmailDomain,
  parseAddressList,
  studentAddress,
} from './gradeEmail'
import { postedGradeSets } from './postedGradeSets'

interface Props {
  classroomId: string
  /** Preselects this subject's most recent posted term. */
  courseSubjectId?: string
  trigger: ReactNode
}

function fmt(value: number | null): string {
  return value === null ? '—' : value.toFixed(2)
}

export function SendGradeEmailsDialog({ classroomId, courseSubjectId, trigger }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-3xl overflow-y-auto">
        {open && (
          <SendGradeEmailsBody
            classroomId={classroomId}
            courseSubjectId={courseSubjectId}
            onClose={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function SendGradeEmailsBody({
  classroomId,
  courseSubjectId,
  onClose,
}: {
  classroomId: string
  courseSubjectId?: string
  onClose: () => void
}) {
  const { toast } = useToast()
  const classroom = useClassroom(classroomId)
  const subjects = useCourseSubjects(classroomId)
  const students = useStudents(classroomId)
  const profile = useProfile()
  const posted = usePostedGrades(classroomId)
  const updateClassroom = useUpdateClassroom()
  const send = useSendGradeEmails()

  const sets = useMemo(
    () => postedGradeSets(posted.data ?? [], subjects.data ?? []),
    [posted.data, subjects.data],
  )
  const [setKey, setSetKey] = useState('')
  const [domainInput, setDomainInput] = useState('')
  const [ccInput, setCcInput] = useState('')
  const [bccInput, setBccInput] = useState('')
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [resend, setResend] = useState(false)
  const [settingsLoaded, setSettingsLoaded] = useState(false)

  // Prefill once from the saved classroom settings.
  useEffect(() => {
    if (settingsLoaded || !classroom.data) return
    setDomainInput(
      classroom.data.student_email_domain
        ? `@${classroom.data.student_email_domain}`
        : '',
    )
    setCcInput(classroom.data.grade_email_cc.join(', '))
    setBccInput(classroom.data.grade_email_bcc.join(', '))
    setSettingsLoaded(true)
  }, [classroom.data, settingsLoaded])

  // Default to the active subject's latest posted term, else the latest overall.
  useEffect(() => {
    if (setKey || sets.length === 0) return
    const preferred =
      sets.find((set) => set.courseSubjectId === courseSubjectId) ?? sets[0]
    setSetKey(preferred.key)
  }, [sets, setKey, courseSubjectId])

  const active = sets.find((set) => set.key === setKey) ?? null
  const log = useGradeEmailLog(
    classroomId,
    active?.courseSubjectId ?? '',
    active?.term ?? '',
  )
  const sentIds = useMemo(
    () =>
      new Set(
        (log.data ?? [])
          .filter((row) => row.status === 'sent')
          .map((row) => row.student_id),
      ),
    [log.data],
  )

  const domain = normalizeEmailDomain(domainInput)
  const cc = parseAddressList(ccInput)
  const bcc = parseAddressList(bccInput)
  const copyError =
    cc.invalid.length || bcc.invalid.length
      ? `Not a valid email: ${[...cc.invalid, ...bcc.invalid].join(', ')}`
      : cc.tooMany || bcc.tooMany
        ? `Up to ${MAX_COPY_RECIPIENTS} addresses each for CC and BCC.`
        : null

  const teacherName = profile.data?.full_name?.trim() || 'Your teacher'
  const teacherEmail = profile.data?.email ?? null
  // The function only sends within the teacher's own school domain; mirror the
  // rule here so the dialog explains a refusal before it happens.
  const schoolDomain = teacherEmail
    ? teacherEmail.slice(teacherEmail.lastIndexOf('@') + 1).toLowerCase()
    : null

  const recipients = useMemo(() => {
    if (!active) return []
    const byId = new Map((students.data ?? []).map((student) => [student.id, student]))
    return active.rows
      .flatMap((row) => {
        const student = byId.get(row.student_id)
        if (!student) return []
        const address = studentAddress(student.student_no, domain)
        return [{ row, student, address }]
      })
      .sort((a, b) =>
        `${a.student.last_name} ${a.student.first_name}`.localeCompare(
          `${b.student.last_name} ${b.student.first_name}`,
        ),
      )
  }, [active, students.data, domain])

  const isSelectable = (studentId: string, address: string | null) =>
    !!address && (resend || !sentIds.has(studentId))
  const selected = recipients.filter(
    ({ student, address }) =>
      isSelectable(student.id, address) && !excluded.has(student.id),
  )

  const sample = selected[0] ?? recipients[0]
  const previewText =
    sample && active
      ? gradeEmailText({
          studentName: `${sample.student.first_name} ${sample.student.last_name}`,
          subjectName: active.subjectName,
          subjectCode: active.subjectCode,
          term: active.term,
          lecture: sample.row.lecture,
          laboratory: sample.row.laboratory,
          termGrade: sample.row.term_grade,
          teacherName,
        })
      : null

  const addMe = (which: 'cc' | 'bcc') => {
    if (!teacherEmail) return
    const [value, setValue] =
      which === 'cc' ? [ccInput, setCcInput] : [bccInput, setBccInput]
    if (parseAddressList(value).addresses.includes(teacherEmail.toLowerCase())) return
    setValue(value.trim() ? `${value.trim()}, ${teacherEmail}` : teacherEmail)
  }

  const toggle = (studentId: string) =>
    setExcluded((previous) => {
      const next = new Set(previous)
      if (next.has(studentId)) next.delete(studentId)
      else next.add(studentId)
      return next
    })

  const settingsChanged =
    !!classroom.data &&
    (classroom.data.student_email_domain !== domain ||
      classroom.data.grade_email_cc.join(',') !== cc.addresses.join(',') ||
      classroom.data.grade_email_bcc.join(',') !== bcc.addresses.join(','))

  const canSend =
    !!active && !!domain && !copyError && selected.length > 0 && !send.isPending

  const submit = async () => {
    if (!active || !domain || copyError) return
    try {
      // The function reads the domain and CC/BCC from the classroom row, so
      // save them first.
      if (settingsChanged) {
        await updateClassroom.mutateAsync({
          id: classroomId,
          patch: {
            student_email_domain: domain,
            grade_email_cc: cc.addresses,
            grade_email_bcc: bcc.addresses,
          },
        })
      }
      const result = await send.mutateAsync({
        classroomId,
        courseSubjectId: active.courseSubjectId,
        term: active.term,
        studentIds: selected.map(({ student }) => student.id),
        resend,
      })
      const failed = result.failed.length
      toast({
        title: `Sent ${result.sent.length} grade email${result.sent.length === 1 ? '' : 's'}`,
        description: failed
          ? `${failed} failed: ${result.failed[0]?.error ?? 'unknown error'}`
          : result.skipped.length
            ? `${result.skipped.length} skipped (already sent or no address).`
            : `${active.subjectName} — ${active.term}`,
        tone: failed ? 'error' : 'success',
      })
      if (!failed) onClose()
    } catch (error) {
      toast({
        title: 'Could not send grade emails',
        description: error instanceof Error ? error.message : String(error),
        tone: 'error',
      })
    }
  }

  const loading =
    classroom.isLoading || subjects.isLoading || students.isLoading || posted.isLoading

  return (
    <>
      <DialogHeader>
        <DialogTitle>Email grades to students</DialogTitle>
        <DialogDescription>
          Each student gets their own email from grades.no-reply@agilearn.net, sent to
          their SchoolID at your school's domain.
        </DialogDescription>
      </DialogHeader>

      {loading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : sets.length === 0 ? (
        <p className="py-6 text-sm text-(--color-ink-muted)">
          No posted grades yet. Use “Import posted grades” to upload a sheet first.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="grade-email-set">Grades to send</Label>
              <select
                id="grade-email-set"
                aria-label="Grades to send"
                value={setKey}
                onChange={(event) => {
                  setSetKey(event.target.value)
                  setExcluded(new Set())
                }}
                className="h-9 w-full rounded-md border border-(--color-border) bg-(--color-surface-1) px-3 text-base md:text-sm"
              >
                {sets.map((set) => (
                  <option key={set.key} value={set.key}>
                    {set.label}
                  </option>
                ))}
              </select>
            </div>
            <Field
              label="Student email domain"
              htmlFor="grade-email-domain"
              error={
                domainInput.trim() && !domain
                  ? 'Enter a domain like @gordoncollege.edu.ph'
                  : undefined
              }
              hint={
                schoolDomain
                  ? `SchoolID + this domain, e.g. 202110190@${domain ?? schoolDomain}. Must be ${schoolDomain} or a subdomain of it.`
                  : 'SchoolID + this domain, e.g. 202110190@gordoncollege.edu.ph'
              }
            >
              <Input
                id="grade-email-domain"
                placeholder="@gordoncollege.edu.ph"
                value={domainInput}
                autoComplete="off"
                onChange={(event) => setDomainInput(event.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(['cc', 'bcc'] as const).map((which) => (
              <Field
                key={which}
                label={which === 'cc' ? 'CC' : 'BCC'}
                htmlFor={`grade-email-${which}`}
                hint={
                  which === 'cc'
                    ? 'Visible to students. Added to every email. School addresses only.'
                    : 'Hidden from students. Added to every email. School addresses only.'
                }
              >
                <div className="flex gap-2">
                  <Input
                    id={`grade-email-${which}`}
                    type="text"
                    inputMode="email"
                    placeholder="you@school.edu"
                    value={which === 'cc' ? ccInput : bccInput}
                    onChange={(event) =>
                      which === 'cc'
                        ? setCcInput(event.target.value)
                        : setBccInput(event.target.value)
                    }
                  />
                  {teacherEmail && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={() => addMe(which)}
                    >
                      Add me
                    </Button>
                  )}
                </div>
              </Field>
            ))}
          </div>
          {copyError && (
            <p role="alert" className="text-xs text-(--color-danger)">
              {copyError}
            </p>
          )}
          {cc.addresses.length > 0 && recipients.length > 1 && (
            <p className="text-xs text-(--color-ink-faint)">
              CC/BCC addresses get one copy per student ({selected.length} emails).
            </p>
          )}

          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-(--color-ink-muted)">
              {selected.length} of {recipients.length} selected
            </p>
            {sentIds.size > 0 && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={resend}
                  onChange={(event) => setResend(event.target.checked)}
                />
                Send again to students already emailed
              </label>
            )}
          </div>

          <TableContainer className="max-h-72 overflow-y-auto">
            <Table>
              <THead>
                <TR>
                  <TH className="w-10">
                    <span className="sr-only">Send</span>
                  </TH>
                  <TH>Student</TH>
                  <TH>Email</TH>
                  <TH className="text-right">Lec</TH>
                  <TH className="text-right">Lab</TH>
                  <TH className="text-right">{active?.term ?? 'Term'}</TH>
                </TR>
              </THead>
              <TBody>
                {recipients.map(({ row, student, address }) => {
                  const selectable = isSelectable(student.id, address)
                  const name = `${student.last_name}, ${student.first_name}`
                  return (
                    <TR key={student.id}>
                      <TD>
                        <input
                          type="checkbox"
                          aria-label={`Send to ${name}`}
                          disabled={!selectable}
                          checked={selectable && !excluded.has(student.id)}
                          onChange={() => toggle(student.id)}
                        />
                      </TD>
                      <TD>
                        {name}
                        {sentIds.has(student.id) && (
                          <Badge tone="success" className="ml-2">
                            Sent ✓
                          </Badge>
                        )}
                      </TD>
                      <TD className="text-xs">
                        {address ?? (
                          <span className="text-(--color-warning)">
                            {student.student_no ? 'Set a domain' : 'No SchoolID'}
                          </span>
                        )}
                      </TD>
                      <TD className="text-right tabular-nums">{fmt(row.lecture)}</TD>
                      <TD className="text-right tabular-nums">{fmt(row.laboratory)}</TD>
                      <TD className="text-right tabular-nums">{fmt(row.term_grade)}</TD>
                    </TR>
                  )
                })}
              </TBody>
            </Table>
          </TableContainer>

          {previewText && active && (
            <details className="rounded-md border border-(--color-border) p-3">
              <summary className="cursor-pointer text-sm font-medium">
                Preview email
                {sample?.address ? ` to ${sample.address}` : ''}
              </summary>
              <p className="mt-3 text-xs text-(--color-ink-faint)">
                Subject: {gradeEmailSubject(active)}
              </p>
              <pre className="mt-2 whitespace-pre-wrap font-sans text-sm">
                {previewText}
              </pre>
            </details>
          )}
        </div>
      )}

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" disabled={!canSend} onClick={() => void submit()}>
          {send.isPending ? <Spinner className="size-4" /> : <Send className="size-4" />}
          Send {selected.length} email{selected.length === 1 ? '' : 's'}
        </Button>
      </DialogFooter>
    </>
  )
}
