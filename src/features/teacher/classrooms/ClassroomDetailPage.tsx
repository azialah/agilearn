import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { Skeleton } from '@/components/ui/Skeleton'
import { RouteSkeleton } from '@/components/ui/RouteSkeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Table, TableContainer, TBody, TD, TH, THead, TR } from '@/components/ui/Table'
import { useToast } from '@/components/ui/toast'
import { EditIcon, PlusIcon, TrashIcon, UsersIcon } from '@/components/icons'
import { useClassroom } from '@/lib/queries/classrooms'
import {
  STUDENTS_PAGE_SIZE,
  useDeleteStudent,
  useStudentsPage,
} from '@/lib/queries/students'
import { studentFullName } from '@/types/domain'
import { ClassroomHeader } from './ClassroomHeader'
import { ClassroomMeta } from './ClassroomMeta'
import { ClassroomTabs } from './ClassroomTabs'
import { StudentFormDialog } from './StudentFormDialog'

export function ClassroomDetailPage({ classroomId }: { classroomId: string }) {
  const { data: classroom, isLoading } = useClassroom(classroomId)
  const [page, setPage] = useState(0)
  const { data: roster, isLoading: studentsLoading } = useStudentsPage(classroomId, page)
  const students = roster?.rows
  const total = roster?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / STUDENTS_PAGE_SIZE))
  const deleteStudent = useDeleteStudent()
  const { toast } = useToast()

  async function handleDeleteStudent(id: string) {
    try {
      await deleteStudent.mutateAsync({ id, classroomId })
      // Emptying the last page would otherwise strand the table on a blank page.
      if (students?.length === 1 && page > 0) setPage(page - 1)
      toast({ title: 'Student removed', tone: 'success' })
    } catch (error) {
      toast({
        title: 'Could not remove student',
        description: error instanceof Error ? error.message : undefined,
        tone: 'error',
      })
    }
  }

  if (isLoading) return <RouteSkeleton />

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
      <ClassroomHeader classroomId={classroomId} />

      <ClassroomMeta classroomId={classroomId} />

      <ClassroomTabs classroomId={classroomId} />

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
        <div className="space-y-2">
          {Array.from({ length: 6 }, (_, row) => (
            <Skeleton key={row} className="h-12 w-full" />
          ))}
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
                <TH className="w-12 text-right">#</TH>
                <TH className="w-40">Student no.</TH>
                <TH>Name</TH>
                <TH className="w-24 text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {students.map((student, index) => (
                <TR key={student.id}>
                  <TD className="text-right text-xs text-(--color-ink-faint)">
                    {page * STUDENTS_PAGE_SIZE + index + 1}
                  </TD>
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
                        confirmPhrase={studentFullName(student)}
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

      {total > STUDENTS_PAGE_SIZE && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-(--color-ink-muted)">
            Page {page + 1} of {pageCount}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page === 0}
              onClick={() => setPage((current) => current - 1)}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page + 1 >= pageCount}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
