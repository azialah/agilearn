import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { ClassroomHeader } from '@/features/teacher/classrooms/ClassroomHeader'
import { ClassroomMeta } from '@/features/teacher/classrooms/ClassroomMeta'
import { OfflineSyncBar } from './OfflineSyncBar'
import { ClassroomTabs } from '@/features/teacher/classrooms/ClassroomTabs'
import { SubjectTabs } from '@/features/teacher/classrooms/SubjectTabs'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { Card, CardBody } from '@/components/ui/Card'
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
import { tallyStatuses } from './summary'
import { SessionFormDialog } from './SessionFormDialog'
import { AttendanceSummary } from './AttendanceSummary'
import { useCourseSubjects } from '@/lib/queries/academicWorkspace'
import { reconcileNotificationIncident } from '@/lib/queries/notifications'
import { studentFullName } from '@/types/domain'
import { consecutiveUnexcusedAbsences } from '@/features/teacher/notifications/evaluators'

function formatSessionDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
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
          title: 'Could not refresh attendance alerts',
          description: error instanceof Error ? error.message : undefined,
          tone: 'error',
        })
      }
    })
    return () => {
      cancelled = true
    }
  }, [allSessionsQuery.data, classroomId, students, toast])

  async function handleDelete(id: string) {
    try {
      await deleteSession.mutateAsync({ id, classroomId })
      toast({ title: 'Session deleted', tone: 'success' })
    } catch (error) {
      toast({
        title: 'Could not delete session',
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
          <PlusIcon /> New session
        </Button>
      }
    />
  )

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
          <h2 className="text-sm font-medium text-(--color-ink-muted)">Attendance</h2>
          <p className="text-sm text-(--color-ink-faint)">
            Track class sessions and per-student attendance.
          </p>
        </div>
        {newSessionButton}
      </div>

      {subjects.length > 1 && (
        <div>
          <p className="mb-1.5 text-sm font-medium">Course subject</p>
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
          title="No sessions yet"
          description="Create a class session to start marking attendance."
          action={newSessionButton}
        />
      ) : (
        <div className="grid gap-3">
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              classroomId={classroomId}
              session={session}
              onDelete={() => handleDelete(session.id)}
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

function SessionCard({
  classroomId,
  session,
  onDelete,
}: {
  classroomId: string
  session: ClassSessionWithRecords
  onDelete: () => void
}) {
  const counts = tallyStatuses(session.attendance_records)
  const present = counts.present + counts.late
  const absent = counts.absent
  const title = session.title.trim() || 'Untitled session'

  return (
    <Card className="transition-colors hover:border-(--color-border-strong)">
      <CardBody className="flex items-center gap-3 p-4">
        <Link
          to="/teacher/classrooms/$classroomId/attendance/$sessionId"
          params={{ classroomId, sessionId: session.id }}
          className="flex min-w-0 flex-1 items-center gap-4"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-(--color-ink) hover:text-(--color-accent-300)">
              {title}
            </p>
            <p className="mt-0.5 text-sm text-(--color-ink-muted)">
              {formatSessionDate(session.session_date)}
            </p>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <Badge tone="success">{present} present</Badge>
            <Badge tone="danger">{absent} absent</Badge>
          </div>
          <ChevronRightIcon className="shrink-0 text-(--color-ink-faint)" />
        </Link>
        <div className="flex items-center gap-1">
          <SessionFormDialog
            classroomId={classroomId}
            courseSubjectId={session.course_subject_id}
            session={session}
            trigger={
              <IconButton label="Edit session" size="sm">
                <EditIcon />
              </IconButton>
            }
          />
          <ConfirmDialog
            title="Delete session?"
            description={`This permanently removes "${title}" and its attendance records.`}
            onConfirm={onDelete}
            trigger={
              <IconButton label="Delete session" size="sm" variant="danger">
                <TrashIcon />
              </IconButton>
            }
          />
        </div>
      </CardBody>
    </Card>
  )
}
