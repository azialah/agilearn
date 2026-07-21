import { useMemo, useState } from 'react'
import { Send } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Label'
import {
  computeConfiguredPeriodFinalGrade,
  computeConfiguredStudentGradebook,
  isConfiguredGradeComplete,
  round2,
  type GradebookStructure,
  type ScoreMap,
} from '@/lib/grading'
import { studentFullName, type Student } from '@/types/domain'

type ReportPeriod = 'overall' | string
type Recipient = 'student' | 'guardian'

export function GradeReportDialog({
  open,
  onOpenChange,
  classroomName,
  structure,
  scores,
  students,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  classroomName: string
  structure: GradebookStructure
  scores: ScoreMap
  students: Student[]
}) {
  const [studentId, setStudentId] = useState(students[0]?.id ?? '')
  const [period, setPeriod] = useState<ReportPeriod>('overall')
  const [recipient, setRecipient] = useState<Recipient>('student')
  const student = students.find((row) => row.id === studentId) ?? students[0]
  const gradebook = useMemo(
    () =>
      student ? computeConfiguredStudentGradebook(structure, scores, student.id) : null,
    [student, structure, scores],
  )
  const email = recipient === 'student' ? student?.student_email : student?.guardian_email
  const grade =
    period === 'overall'
      ? (gradebook?.final ?? null)
      : student
        ? computeConfiguredPeriodFinalGrade(structure, scores, student.id, period)
        : null
  const label =
    period === 'overall'
      ? 'Overall'
      : (structure.periods.find((item) => item.id === period)?.name ?? 'Grade')
  const incomplete =
    grade === null ||
    !student ||
    !isConfiguredGradeComplete(
      structure,
      scores,
      student.id,
      period === 'overall' ? undefined : period,
    )
  const compose = () => {
    if (!student || !email || incomplete) return
    const body = `Hello,\n\nHere is the ${label.toLowerCase()} grade report for ${studentFullName(student)} in ${classroomName}.\n\n${label} grade: ${round2(grade).toFixed(2)}\n\nPlease contact your teacher if you have questions.\n`
    window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(`${classroomName} — ${label} grade report`)}&body=${encodeURIComponent(body)}`
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Preview grade report</DialogTitle>
          <DialogDescription>
            Review one private learner report before opening your mail app. Incomplete
            grades cannot be composed.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="report-student">Learner</Label>
            <select
              id="report-student"
              aria-label="Learner"
              value={student?.id ?? ''}
              onChange={(event) => setStudentId(event.target.value)}
              className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 text-base md:text-sm"
            >
              {students.map((row) => (
                <option key={row.id} value={row.id}>
                  {studentFullName(row)}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="report-period">Report period</Label>
              <select
                id="report-period"
                aria-label="Report period"
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
                className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 text-base md:text-sm"
              >
                <option value="overall">Overall grade</option>
                {structure.periods.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="report-recipient">Recipient</Label>
              <select
                id="report-recipient"
                aria-label="Grade report recipient"
                value={recipient}
                onChange={(event) => setRecipient(event.target.value as Recipient)}
                className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 text-base md:text-sm"
              >
                <option value="student">Student email</option>
                <option value="guardian">Guardian email</option>
              </select>
            </div>
          </div>
          <div className="rounded-[var(--radius-md)] bg-[var(--color-surface-2)] p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-faint)]">
              {label} grade
            </p>
            <p className="mt-1 text-3xl font-semibold">
              {incomplete ? 'Incomplete' : round2(grade).toFixed(2)}
            </p>
            <p className="mt-2 text-xs text-[var(--color-ink-muted)]">
              {email
                ? `Ready for ${email}`
                : `No ${recipient} email saved for this learner.`}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button type="button" disabled={!email || incomplete} onClick={compose}>
            <Send className="size-4" /> Compose privately
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
