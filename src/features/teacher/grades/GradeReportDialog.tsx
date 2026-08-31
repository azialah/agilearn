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
  findWeightIssues,
  isConfiguredGradeComplete,
  round2,
  type GradebookStructure,
  type ScoreMap,
} from '@/lib/grading'
import { studentFullName, type Student } from '@/types/domain'
import { useLocale } from '@/lib/locale'

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
  const { t } = useLocale()
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
      ? t('reportDialogOverallLabel')
      : (structure.periods.find((item) => item.id === period)?.name ??
        t('reportDialogGradeFallback'))
  const incomplete =
    grade === null ||
    !student ||
    // A structure that does not total 100% still produces a number, because the
    // engine renormalizes — but it is not the split the teacher configured, and
    // this one goes to a guardian. Treat it as not ready to send.
    findWeightIssues(structure).length > 0 ||
    !isConfiguredGradeComplete(
      structure,
      scores,
      student.id,
      period === 'overall' ? undefined : period,
    )
  const compose = () => {
    if (!student || !email || incomplete) return
    const body = t('reportDialogEmailBody', {
      periodLower: label.toLowerCase(),
      studentName: studentFullName(student),
      classroom: classroomName,
      periodLabel: label,
      grade: round2(grade).toFixed(2),
    })
    const subject = t('reportDialogEmailSubject', {
      classroom: classroomName,
      period: label,
    })
    window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('reportDialogTitle')}</DialogTitle>
          <DialogDescription>{t('reportDialogDescription')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="report-student">{t('reportDialogLearnerLabel')}</Label>
            <select
              id="report-student"
              aria-label={t('reportDialogLearnerLabel')}
              value={student?.id ?? ''}
              onChange={(event) => setStudentId(event.target.value)}
              className="h-9 w-full rounded-md border border-(--color-border) bg-(--color-surface-1) px-3 text-base md:text-sm"
            >
              {students.map((row) => (
                <option key={row.id} value={row.id}>
                  {studentFullName(row)}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="report-period">{t('reportDialogPeriodLabel')}</Label>
              <select
                id="report-period"
                aria-label={t('reportDialogPeriodLabel')}
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
                className="h-9 w-full rounded-md border border-(--color-border) bg-(--color-surface-1) px-3 text-base md:text-sm"
              >
                <option value="overall">{t('reportDialogOverallOption')}</option>
                {structure.periods.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="report-recipient">{t('reportDialogRecipientLabel')}</Label>
              <select
                id="report-recipient"
                aria-label={t('reportDialogRecipientAriaLabel')}
                value={recipient}
                onChange={(event) => setRecipient(event.target.value as Recipient)}
                className="h-9 w-full rounded-md border border-(--color-border) bg-(--color-surface-1) px-3 text-base md:text-sm"
              >
                <option value="student">{t('reportDialogStudentEmailOption')}</option>
                <option value="guardian">{t('reportDialogGuardianEmailOption')}</option>
              </select>
            </div>
          </div>
          <div className="rounded-md bg-(--color-surface-2) p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-(--color-ink-faint)">
              {t('reportDialogGradeHeading', { period: label })}
            </p>
            <p className="mt-1 text-3xl font-semibold">
              {incomplete ? t('reportDialogIncompleteLabel') : round2(grade).toFixed(2)}
            </p>
            <p className="mt-2 text-xs text-(--color-ink-muted)">
              {email
                ? t('reportDialogReadyFor', { email })
                : t('reportDialogNoEmailSaved', {
                    recipient:
                      recipient === 'student'
                        ? t('reportDialogStudentWord')
                        : t('reportDialogGuardianWord'),
                  })}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {t('commonClose')}
          </Button>
          <Button type="button" disabled={!email || incomplete} onClick={compose}>
            <Send className="size-4" /> {t('reportDialogCompose')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
