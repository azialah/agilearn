import { Link } from '@tanstack/react-router'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Table, TableContainer, TBody, TD, TH, THead, TR } from '@/components/ui/Table'
import { useToast } from '@/components/ui/toast'
import { EditIcon, PlusIcon, TrashIcon, UsersIcon } from '@/components/icons'
import { useProfile } from '@/lib/queries/profiles'
import { useClassroom } from '@/lib/queries/classrooms'
import { useCourseSubjects } from '@/lib/queries/academicWorkspace'
import { useDeleteStudent, useStudents } from '@/lib/queries/students'
import { studentFullName } from '@/types/domain'
import { ImportButton } from '@/features/teacher/io/ImportButton'
import { ExportMenu } from '@/features/teacher/io/ExportMenu'
import { ClassroomFormDialog } from './ClassroomFormDialog'
import { StudentFormDialog } from './StudentFormDialog'
import { MeetingSlotDialog } from '@/features/teacher/calendar/MeetingSlotDialog'

const TABS = [
  { label: 'Roster', to: '/teacher/classrooms/$classroomId', exact: true },
  { label: 'Grades', to: '/teacher/classrooms/$classroomId/grades', exact: false },
  {
    label: 'Attendance',
    to: '/teacher/classrooms/$classroomId/attendance',
    exact: false,
  },
  { label: 'Slideshow', to: '/teacher/classrooms/$classroomId/slideshow', exact: false },
] as const

export function ClassroomDetailPage({ classroomId }: { classroomId: string }) {
  const { data: profile } = useProfile()
  const { data: classroom, isLoading } = useClassroom(classroomId)
  const { data: students, isLoading: studentsLoading } = useStudents(classroomId)
  const { data: subjects = [] } = useCourseSubjects(classroomId)
  const deleteStudent = useDeleteStudent()
  const { toast } = useToast()

  async function handleDeleteStudent(id: string) {
    try {
      await deleteStudent.mutateAsync({ id, classroomId })
      toast({ title: 'Student removed', tone: 'success' })
    } catch (error) {
      toast({
        title: 'Could not remove student',
        description: error instanceof Error ? error.message : undefined,
        tone: 'error',
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    )
  }

  if (!classroom) {
    return (
      <EmptyState
        title="Classroom not found"
        description="It may have been deleted or you may not have access."
        action={
          <Link to="/teacher/classrooms">
            <Button variant="secondary">Back to classrooms</Button>
          </Link>
        }
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={classroom.course_name}
        description={`${classroom.course_code} · ${classroom.year} · ${classroom.block}`}
        actions={
          <div className="flex items-center gap-2">
            <ImportButton classroomId={classroomId} />
            <ExportMenu classroomId={classroomId} />
            {profile && (
              <ClassroomFormDialog
                ownerId={profile.id}
                classroom={classroom}
                trigger={
                  <Button variant="secondary">
                    <EditIcon /> Edit
                  </Button>
                }
              />
            )}
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge>{students?.length ?? 0} students</Badge>
        {subjects.map((subject) => (
          <Badge key={subject.id} tone="accent">
            {subject.name}
          </Badge>
        ))}
      </div>

      {subjects.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {subjects.map((subject) => (
            <MeetingSlotDialog key={subject.id} subject={subject} />
          ))}
        </div>
      )}

      <nav className="flex gap-1 border-b border-(--color-border)">
        {TABS.map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
            params={{ classroomId }}
            activeOptions={{ exact: tab.exact }}
            className="-mb-px border-b-2 border-transparent px-3 py-2 text-sm text-(--color-ink-muted) transition-colors hover:text-(--color-ink)"
            activeProps={{
              className:
                '-mb-px border-b-2 border-(--color-accent-400) px-3 py-2 text-sm font-medium text-(--color-ink)',
            }}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-(--color-ink-muted)">Roster</h2>
        <StudentFormDialog
          classroomId={classroomId}
          trigger={
            <Button size="sm">
              <PlusIcon /> Add student
            </Button>
          }
        />
      </div>

      {studentsLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : !students || students.length === 0 ? (
        <EmptyState
          icon={<UsersIcon />}
          title="No students yet"
          description="Add students individually or import a roster spreadsheet."
        />
      ) : (
        <TableContainer>
          <Table>
            <THead>
              <TR>
                <TH className="w-40">Student no.</TH>
                <TH>Name</TH>
                <TH className="w-24 text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {students.map((student) => (
                <TR key={student.id}>
                  <TD className="font-mono text-xs text-(--color-ink-muted)">
                    {student.student_no}
                  </TD>
                  <TD className="font-medium">{studentFullName(student)}</TD>
                  <TD>
                    <div className="flex items-center justify-end gap-1">
                      <StudentFormDialog
                        classroomId={classroomId}
                        student={student}
                        trigger={
                          <IconButton label="Edit student" size="sm">
                            <EditIcon />
                          </IconButton>
                        }
                      />
                      <ConfirmDialog
                        title="Remove student?"
                        description={`This removes ${studentFullName(student)} and their scores and attendance.`}
                        confirmLabel="Remove"
                        onConfirm={() => handleDeleteStudent(student.id)}
                        trigger={
                          <IconButton label="Remove student" size="sm" variant="danger">
                            <TrashIcon />
                          </IconButton>
                        }
                      />
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </TableContainer>
      )}
    </div>
  )
}
