import { useEffect, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/toast'
import { OfflineSyncBar } from './OfflineSyncBar'
import { AttendanceImportButton } from './AttendanceImportButton'
import { cn } from '@/lib/cn'
import { ChevronRightIcon, UsersIcon } from '@/components/icons'
import { STUDENTS_PAGE_SIZE, useStudents } from '@/lib/queries/students'
import {
  useBulkUpsertAttendance,
  useClassSession,
  useSessionRecords,
  useUpsertAttendance,
} from '@/lib/queries/attendance'
import {
  studentFullName,
  type AttendanceRecord,
  type AttendanceStatus,
} from '@/types/domain'
import { tallyStatuses, ATTENDANCE_STATUSES } from './summary'
import { getStatusMeta } from './status'
import { useLocale } from '@/lib/locale'

function formatSessionDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function SessionPage({
  classroomId,
  sessionId,
}: {
  classroomId: string
  sessionId: string
}) {
  const { data: session, isLoading: sessionLoading } = useClassSession(sessionId)
  const { data: students, isLoading: studentsLoading } = useStudents(classroomId)
  const { data: records, isLoading: recordsLoading } = useSessionRecords(sessionId)
  const upsert = useUpsertAttendance(sessionId, classroomId)
  const bulkUpsert = useBulkUpsertAttendance(sessionId, classroomId)
  const { toast } = useToast()
  const { t } = useLocale()
  // Client-side, not a server page: counts, "mark all present", and the
  // unrecorded tally all need the whole roster regardless of which page is
  // showing.
  const [page, setPage] = useState(0)
  const pageCount = Math.max(1, Math.ceil((students?.length ?? 0) / STUDENTS_PAGE_SIZE))
  const visibleStudents = students?.slice(
    page * STUDENTS_PAGE_SIZE,
    page * STUDENTS_PAGE_SIZE + STUDENTS_PAGE_SIZE,
  )

  const recordByStudent = useMemo(
    () => new Map((records ?? []).map((record) => [record.student_id, record])),
    [records],
  )

  const counts = useMemo(() => tallyStatuses(records ?? []), [records])
  const unrecorded = (students?.length ?? 0) - (records?.length ?? 0)

  function setStatus(studentId: string, status: AttendanceStatus) {
    const existing = recordByStudent.get(studentId)
    upsert.mutate(
      {
        session_id: sessionId,
        student_id: studentId,
        status,
        remarks: existing?.remarks ?? '',
      },
      {
        onError: (error) =>
          toast({
            title: t('attendanceSaveError'),
            description: error instanceof Error ? error.message : undefined,
            tone: 'error',
          }),
      },
    )
  }

  function saveRemarks(studentId: string, remarks: string) {
    const existing = recordByStudent.get(studentId)
    if ((existing?.remarks ?? '') === remarks) return
    upsert.mutate(
      {
        session_id: sessionId,
        student_id: studentId,
        status: existing?.status ?? 'present',
        remarks,
      },
      {
        onError: (error) =>
          toast({
            title: t('attendanceSaveRemarkError'),
            description: error instanceof Error ? error.message : undefined,
            tone: 'error',
          }),
      },
    )
  }

  function markAllPresent() {
    if (!students || students.length === 0) return
    bulkUpsert.mutate(
      students.map((student) => ({
        session_id: sessionId,
        student_id: student.id,
        status: 'present' as const,
        remarks: recordByStudent.get(student.id)?.remarks ?? '',
      })),
      {
        onSuccess: () =>
          toast({ title: t('attendanceMarkedAllPresent'), tone: 'success' }),
        onError: (error) =>
          toast({
            title: t('attendanceMarkAllPresentError'),
            description: error instanceof Error ? error.message : undefined,
            tone: 'error',
          }),
      },
    )
  }

  const title = session?.title?.trim() || t('attendanceSessionFallbackTitle')

  return (
    <div className="space-y-6">
      {/* Marking happens here, so this is where a stranded change must be
          visible — not one screen back. */}
      <OfflineSyncBar />
      <div className="space-y-2">
        <Link
          to="/teacher/classrooms/$classroomId/attendance"
          params={{ classroomId }}
          className="inline-flex items-center gap-1 text-sm text-(--color-ink-muted) transition-colors hover:text-(--color-ink)"
        >
          <ChevronRightIcon className="size-4 rotate-180" /> {t('attendanceBackToList')}
        </Link>
        <PageHeader
          title={sessionLoading ? t('attendanceSessionFallbackTitle') : title}
          description={
            session
              ? formatSessionDate(session.session_date)
              : t('attendanceMarkDescription')
          }
          actions={
            students && students.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                <AttendanceImportButton
                  sessionId={sessionId}
                  classroomId={classroomId}
                  students={students}
                />
                <Button
                  variant="secondary"
                  loading={bulkUpsert.isPending}
                  onClick={markAllPresent}
                >
                  {t('attendanceMarkAllPresent')}
                </Button>
              </div>
            ) : undefined
          }
        />
      </div>

      {session?.notes?.trim() && (
        <Card>
          <CardBody className="p-4 text-sm text-(--color-ink-muted)">
            {session.notes}
          </CardBody>
        </Card>
      )}

      {students && students.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge tone="success">
            {t('attendancePresentCount', { n: counts.present })}
          </Badge>
          <Badge tone="warning">{t('attendanceLateCount', { n: counts.late })}</Badge>
          <Badge tone="accent">
            {t('attendanceExcusedCount', { n: counts.excused })}
          </Badge>
          <Badge tone="danger">{t('attendanceAbsentCount', { n: counts.absent })}</Badge>
          {unrecorded > 0 && (
            <Badge tone="neutral">
              {t('attendanceUnrecordedCount', { n: unrecorded })}
            </Badge>
          )}
        </div>
      )}

      {studentsLoading || recordsLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }, (_, row) => (
            <Skeleton key={row} className="h-12 w-full" />
          ))}
        </div>
      ) : !students || students.length === 0 ? (
        <EmptyState
          icon={<UsersIcon />}
          title={t('attendanceNoStudents')}
          description={t('attendanceNoStudentsDescription')}
          action={
            <Link to="/teacher/classrooms/$classroomId" params={{ classroomId }}>
              <Button variant="secondary">{t('attendanceGoToRoster')}</Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid gap-2">
            {visibleStudents?.map((student) => (
              <RosterRow
                key={student.id}
                name={studentFullName(student)}
                record={recordByStudent.get(student.id)}
                onSetStatus={(status) => setStatus(student.id, status)}
                onSaveRemarks={(remarks) => saveRemarks(student.id, remarks)}
              />
            ))}
          </div>
          {students.length > STUDENTS_PAGE_SIZE && (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-(--color-ink-muted)">
                {t('commonPageOf', { current: page + 1, total: pageCount })}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page === 0}
                  onClick={() => setPage((current) => current - 1)}
                >
                  {t('commonPrevious')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page + 1 >= pageCount}
                  onClick={() => setPage((current) => current + 1)}
                >
                  {t('commonNext')}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function RosterRow({
  name,
  record,
  onSetStatus,
  onSaveRemarks,
}: {
  name: string
  record: AttendanceRecord | undefined
  onSetStatus: (status: AttendanceStatus) => void
  onSaveRemarks: (remarks: string) => void
}) {
  const { t } = useLocale()
  const recorded = !!record
  const [remarks, setRemarks] = useState(record?.remarks ?? '')

  // Keep the local draft in sync when the persisted value changes underneath us
  // (e.g. after "mark all present" or a rollback), but never clobber the field
  // while it is unchanged from the source.
  useEffect(() => {
    setRemarks(record?.remarks ?? '')
  }, [record?.remarks])

  return (
    <Card className={cn(!recorded && 'border-dashed')}>
      <CardBody className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-center gap-2 sm:w-56 sm:shrink-0">
          <span className="truncate font-medium text-(--color-ink)">{name}</span>
          {!recorded && <Badge tone="neutral">{t('attendanceUnrecordedBadge')}</Badge>}
        </div>

        <StatusToggle value={record?.status} onChange={onSetStatus} />

        <Input
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          onBlur={() => onSaveRemarks(remarks.trim())}
          placeholder={t('attendanceRemarksPlaceholder')}
          className="sm:flex-1"
          aria-label={t('attendanceRemarksAriaLabel', { name })}
        />
      </CardBody>
    </Card>
  )
}

function StatusToggle({
  value,
  onChange,
}: {
  value: AttendanceStatus | undefined
  onChange: (status: AttendanceStatus) => void
}) {
  const { t } = useLocale()
  const statusMeta = getStatusMeta(t)
  return (
    <div
      role="group"
      aria-label={t('attendanceStatusGroupLabel')}
      className="flex shrink-0 gap-1 rounded-md bg-(--color-surface-1) p-1"
    >
      {ATTENDANCE_STATUSES.map((status) => {
        const meta = statusMeta[status]
        const active = value === status
        const isUnsetDefault = value === undefined && status === 'present'
        return (
          <motion.button
            key={status}
            type="button"
            whileTap={{ scale: 0.94 }}
            aria-pressed={active}
            onClick={() => onChange(status)}
            className={cn(
              'rounded-sm px-2.5 py-1 text-xs font-medium transition-colors sm:px-3',
              active
                ? meta.activeClass
                : 'text-(--color-ink-muted) hover:bg-(--color-surface-3) hover:text-(--color-ink)',
              isUnsetDefault &&
                'text-(--color-ink-faint) outline outline-1 outline-dashed outline-(--color-border-strong)',
            )}
            title={meta.label}
          >
            <span className="sm:hidden">{meta.short}</span>
            <span className="hidden sm:inline">{meta.label}</span>
          </motion.button>
        )
      })}
    </div>
  )
}
