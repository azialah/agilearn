import { Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { Upload } from 'lucide-react'
import { ClassroomHeader } from '@/features/teacher/classrooms/ClassroomHeader'
import { ClassroomMeta } from '@/features/teacher/classrooms/ClassroomMeta'
import { OfflineSyncBar } from './OfflineSyncBar'
import { ClassroomTabs } from '@/features/teacher/classrooms/ClassroomTabs'
import { SubjectTabs } from '@/features/teacher/classrooms/SubjectTabs'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/toast'
import {
  CalendarIcon,
  ChevronRightIcon,
  EditIcon,
  PlusIcon,
  TrashIcon,
} from '@/components/icons'
import { useStudents } from '@/lib/queries/students'
import {
  useClassSessions,
  useDeleteSession,
  type ClassSessionWithRecords,
} from '@/lib/queries/attendance'
import {
  attendanceRate,
  formatRate,
  groupSessionsByMonth,
  tallyStatuses,
} from './summary'
import { SessionFormDialog } from './SessionFormDialog'
import { AttendanceImportButton } from './AttendanceImportButton'
import { AttendanceSummary } from './AttendanceSummary'
import { useCourseSubjects } from '@/lib/queries/academicWorkspace'
import { reconcileNotificationIncident } from '@/lib/queries/notifications'
import { studentFullName, type Student } from '@/types/domain'
import { consecutiveUnexcusedAbsences } from '@/features/teacher/notifications/evaluators'
import { useLocale } from '@/lib/locale'

/**
 * `session_date` is a wall-clock school day (`YYYY-MM-DD`), so it is read as
 * local midnight. Parsing it as UTC would show the previous day for anyone west
 * of the meridian.
 */
function sessionDay(iso: string): Date | null {
  const date = new Date(`${iso}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatWeekday(iso: string): string {
  return sessionDay(iso)?.toLocaleDateString(undefined, { weekday: 'short' }) ?? ''
}

function formatDayNumber(iso: string): string {
  return sessionDay(iso)?.toLocaleDateString(undefined, { day: 'numeric' }) ?? iso
}

/** `2026-08` → `August 2026`. */
function formatMonth(key: string): string {
  const date = sessionDay(`${key}-01`)
  if (!date) return key
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

export function AttendancePage({
  classroomId,
  focusStudentId,
  initialSubjectId,
  onSubjectChange,
}: {
  classroomId: string
  focusStudentId?: string
  initialSubjectId?: string
  /** Lets the route sync the selection into the URL — kept as a callback so
   *  this component doesn't need to import its own route. */
  onSubjectChange?: (subjectId: string) => void
}) {
  const { data: subjects = [] } = useCourseSubjects(classroomId)
  const [subjectId, setSubjectId] = useState(initialSubjectId ?? '')
  useEffect(() => {
    if (initialSubjectId) setSubjectId(initialSubjectId)
  }, [initialSubjectId])
  useEffect(() => {
    if (!subjectId && subjects[0]) setSubjectId(subjects[0].id)
  }, [subjectId, subjects])
  function handleSubjectChange(id: string) {
    setSubjectId(id)
    onSubjectChange?.(id)
  }
  const { data: sessions, isLoading } = useClassSessions(
    classroomId,
    subjectId || undefined,
  )
  const allSessionsQuery = useClassSessions(classroomId)
  const { data: students, isLoading: studentsLoading } = useStudents(classroomId)
  const deleteSession = useDeleteSession()
  const { toast } = useToast()
  const { t } = useLocale()

  useEffect(() => {
    const allSessions = allSessionsQuery.data
    if (!allSessions || !students?.length) return
    let cancelled = false
    const evaluations = students.map((student) => {
      const streak = consecutiveUnexcusedAbsences(
        allSessions.map((session) => ({
          status:
            session.attendance_records.find((record) => record.student_id === student.id)
              ?.status ?? null,
          sessionDate: session.session_date,
          createdAt: session.created_at,
        })),
      )
      return reconcileNotificationIncident({
        type: 'absence_streak',
        classroomId,
        studentId: student.id,
        active: streak >= 3,
        payload: { studentName: studentFullName(student), value: streak },
      })
    })
    void Promise.all(evaluations).catch((error: unknown) => {
      if (!cancelled) {
        toast({
          title: t('attendanceAlertsRefreshError'),
          description: error instanceof Error ? error.message : undefined,
          tone: 'error',
        })
      }
    })
    return () => {
      cancelled = true
    }
  }, [allSessionsQuery.data, classroomId, students, toast, t])

  async function handleDelete(id: string) {
    try {
      await deleteSession.mutateAsync({ id, classroomId })
      toast({ title: t('attendanceSessionDeleted'), tone: 'success' })
    } catch (error) {
      toast({
        title: t('attendanceDeleteSessionError'),
        description: error instanceof Error ? error.message : undefined,
        tone: 'error',
      })
    }
  }

  const newSessionButton = (
    <SessionFormDialog
      classroomId={classroomId}
      courseSubjectId={subjectId}
      trigger={
        <Button>
          <PlusIcon /> {t('attendanceNewSession')}
        </Button>
      }
    />
  )

  const months = useMemo(() => groupSessionsByMonth(sessions ?? []), [sessions])

  const showSummary =
    !isLoading &&
    !studentsLoading &&
    !!students &&
    students.length > 0 &&
    !!sessions &&
    sessions.length > 0

  return (
    <div className="space-y-6">
      <ClassroomHeader classroomId={classroomId} />
      <ClassroomMeta classroomId={classroomId} />
      <OfflineSyncBar />
      <ClassroomTabs classroomId={classroomId} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-(--color-ink-muted)">
            {t('attendancePageTitle')}
          </h2>
          <p className="text-sm text-(--color-ink-faint)">
            {t('attendancePageDescription')}
          </p>
        </div>
        {newSessionButton}
      </div>

      {subjects.length > 1 && (
        <div>
          <p className="mb-1.5 text-sm font-medium">{t('attendanceCourseSubject')}</p>
          <SubjectTabs
            subjects={subjects}
            value={subjectId}
            onChange={handleSubjectChange}
          />
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : !sessions || sessions.length === 0 ? (
        <EmptyState
          icon={<CalendarIcon />}
          title={t('attendanceNoSessions')}
          description={t('attendanceNoSessionsDescription')}
          action={newSessionButton}
        />
      ) : (
        <div className="space-y-5">
          {months.map((month) => (
            <MonthGroup
              key={month.key}
              monthKey={month.key}
              sessions={month.sessions}
              classroomId={classroomId}
              students={students ?? []}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {showSummary && (
        <AttendanceSummary
          students={students}
          sessions={sessions}
          focusStudentId={focusStudentId}
        />
      )}
    </div>
  )
}

/**
 * One calendar month of sessions.
 *
 * A term runs to dozens of sessions, and an undifferentiated list of equal-sized
 * cards gives no sense of where you are in it. The month header is the anchor —
 * it stays put while its own sessions scroll under it, and carries the month's
 * attendance rate so a bad stretch is visible without opening anything.
 */
function MonthGroup({
  monthKey,
  sessions,
  classroomId,
  students,
  onDelete,
}: {
  monthKey: string
  sessions: ClassSessionWithRecords[]
  classroomId: string
  students: Student[]
  onDelete: (id: string) => void
}) {
  const { t } = useLocale()
  const rate = attendanceRate(
    tallyStatuses(sessions.flatMap((session) => session.attendance_records)),
  )

  return (
    <section>
      <header className="sticky top-0 z-10 flex items-baseline justify-between gap-3 bg-(--color-surface-0)/90 py-2 backdrop-blur">
        <h3 className="text-sm font-semibold text-(--color-ink)">
          {formatMonth(monthKey)}
        </h3>
        <p className="text-xs text-(--color-ink-faint)">
          {t(
            sessions.length === 1
              ? 'attendanceMonthSessionsOne'
              : 'attendanceMonthSessionsOther',
            { n: sessions.length },
          )}
          {rate !== null && ` · ${t('attendanceMonthRate', { rate: formatRate(rate) })}`}
        </p>
      </header>
      <ul className="overflow-hidden rounded-2xl border border-(--color-border) bg-(--color-surface-1)">
        {sessions.map((session) => (
          <SessionRow
            key={session.id}
            classroomId={classroomId}
            session={session}
            students={students}
            onDelete={() => onDelete(session.id)}
          />
        ))}
      </ul>
    </section>
  )
}

function SessionRow({
  classroomId,
  session,
  students,
  onDelete,
}: {
  classroomId: string
  session: ClassSessionWithRecords
  students: Student[]
  onDelete: () => void
}) {
  const { t } = useLocale()
  const counts = tallyStatuses(session.attendance_records)
  const present = counts.present + counts.late
  const absent = counts.absent
  const recorded = present + absent + counts.excused
  const title = session.title.trim() || t('attendanceUntitledSession')

  return (
    <li className="group flex items-center gap-3 border-b border-(--color-border) px-3 py-2 last:border-b-0 hover:bg-(--color-surface-2)">
      <Link
        to="/teacher/classrooms/$classroomId/attendance/$sessionId"
        params={{ classroomId, sessionId: session.id }}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        {/* Day first: within a month the weekday and date are what identifies a
            session, so they lead rather than repeating the month on every row. */}
        <span className="flex w-11 shrink-0 flex-col items-center rounded-lg bg-(--color-surface-3) py-1">
          <span className="text-[0.65rem] uppercase tracking-wide text-(--color-ink-muted)">
            {formatWeekday(session.session_date)}
          </span>
          <span className="text-sm font-semibold leading-none text-(--color-ink)">
            {formatDayNumber(session.session_date)}
          </span>
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-(--color-ink) group-hover:text-(--color-accent-300)">
            {title}
          </span>
          {recorded === 0 ? (
            <span className="text-xs text-(--color-ink-faint)">
              {t('attendanceSessionNotRecorded')}
            </span>
          ) : (
            <span
              className="mt-1 flex h-1 w-full max-w-40 overflow-hidden rounded-full bg-(--color-danger)/30"
              role="img"
              aria-label={t('attendanceSessionMixLabel', { present, absent })}
            >
              <span
                className="h-full rounded-full bg-(--color-success)"
                style={{ width: `${(present / recorded) * 100}%` }}
              />
            </span>
          )}
        </span>

        <span className="hidden items-center gap-2 sm:flex">
          <Badge tone="success">{t('attendancePresentCount', { n: present })}</Badge>
          <Badge tone="danger">{t('attendanceAbsentCount', { n: absent })}</Badge>
        </span>
        <ChevronRightIcon className="shrink-0 text-(--color-ink-faint)" />
      </Link>

      {/* Quiet until hovered or focused on a pointer device — but always visible
          on touch, where there is no hover and these would be unreachable. */}
      <span className="flex shrink-0 items-center gap-0.5 transition-opacity sm:opacity-0 sm:focus-within:opacity-100 sm:group-hover:opacity-100">
        {students.length > 0 && (
          <AttendanceImportButton
            sessionId={session.id}
            classroomId={classroomId}
            students={students}
            trigger={
              <IconButton label={t('attendanceSessionImportLabel', { title })} size="sm">
                <Upload className="size-4" />
              </IconButton>
            }
          />
        )}
        <SessionFormDialog
          classroomId={classroomId}
          courseSubjectId={session.course_subject_id}
          session={session}
          trigger={
            <IconButton label={t('attendanceEditSession')} size="sm">
              <EditIcon />
            </IconButton>
          }
        />
        <ConfirmDialog
          title={t('attendanceDeleteSessionTitle')}
          description={t('attendanceDeleteSessionDescription', { title })}
          onConfirm={onDelete}
          trigger={
            <IconButton label={t('attendanceDeleteSession')} size="sm" variant="danger">
              <TrashIcon />
            </IconButton>
          }
        />
      </span>
    </li>
  )
}
