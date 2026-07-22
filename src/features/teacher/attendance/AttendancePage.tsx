import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
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

export function AttendancePage({ classroomId }: { classroomId: string }) {
  const { data: subjects = [] } = useCourseSubjects(classroomId)
  const [subjectId, setSubjectId] = useState('')
  useEffect(() => {
    if (!subjectId && subjects[0]) setSubjectId(subjects[0].id)
  }, [subjectId, subjects])
  const { data: sessions, isLoading } = useClassSessions(
    classroomId,
    subjectId || undefined,
  )
  const { data: students, isLoading: studentsLoading } = useStudents(classroomId)
  const deleteSession = useDeleteSession()
  const { toast } = useToast()

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
      <PageHeader
        title="Attendance"
        description="Track class sessions and per-student attendance."
        actions={newSessionButton}
      />

      {subjects.length > 1 && (
        <label className="block max-w-sm text-sm font-medium">
          Course subject
          <select
            aria-label="Course subject"
            value={subjectId}
            onChange={(event) => setSubjectId(event.target.value)}
            className="mt-1.5 h-10 w-full rounded-full border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3"
          >
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </label>
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

      {showSummary && <AttendanceSummary students={students} sessions={sessions} />}
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
    <Card className="transition-colors hover:border-[var(--color-border-strong)]">
      <CardBody className="flex items-center gap-3 p-4">
        <Link
          to="/teacher/classrooms/$classroomId/attendance/$sessionId"
          params={{ classroomId, sessionId: session.id }}
          className="flex min-w-0 flex-1 items-center gap-4"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-[var(--color-ink)] hover:text-[var(--color-accent-300)]">
              {title}
            </p>
            <p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">
              {formatSessionDate(session.session_date)}
            </p>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <Badge tone="success">{present} present</Badge>
            <Badge tone="danger">{absent} absent</Badge>
          </div>
          <ChevronRightIcon className="shrink-0 text-[var(--color-ink-faint)]" />
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
