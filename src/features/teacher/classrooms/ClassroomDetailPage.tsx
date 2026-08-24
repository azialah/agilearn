import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { IconButton } from '@/components/ui/IconButton'
import { Skeleton } from '@/components/ui/Skeleton'
import { RouteSkeleton } from '@/components/ui/RouteSkeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Table, TableContainer, TBody, TD, TH, THead, TR } from '@/components/ui/Table'
import { useToast } from '@/components/ui/toast'
import { EditIcon, PlusIcon, TrashIcon, UsersIcon } from '@/components/icons'
import { useLocale } from '@/lib/locale'
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
  const { t } = useLocale()
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
      toast({ title: t('classroomsStudentRemovedToast'), tone: 'success' })
    } catch (error) {
      toast({
        title: t('classroomsRemoveStudentError'),
        description: error instanceof Error ? error.message : undefined,
        tone: 'error',
      })
    }
  }

  if (isLoading) return <RouteSkeleton />

  if (!classroom) {
    return (
      <EmptyState
        title={t('classroomsNotFoundTitle')}
        description={t('classroomsNotFoundDescription')}
        action={
          <Link to="/teacher/classrooms">
            <Button variant="secondary">{t('classroomsBackButton')}</Button>
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

      {studentsLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }, (_, row) => (
            <Skeleton key={row} className="h-12 w-full" />
          ))}
        </div>
      ) : !students || students.length === 0 ? (
        <EmptyState
          icon={<UsersIcon />}
          title={t('classroomsNoStudentsTitle')}
          description={t('classroomsNoStudentsDescription')}
        />
      ) : (
        /* Same shell as the attendance report: a card whose header owns the
           title, the count and the primary action, with the table flush inside
           it. Two tables of students on adjacent tabs should not look like they
           come from different applications. */
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle>{t('classroomsRosterHeading')}</CardTitle>
              <p className="text-sm text-(--color-ink-muted)">
                {t(
                  total === 1 ? 'classroomsRosterCountOne' : 'classroomsRosterCountOther',
                  { n: total },
                )}
              </p>
            </div>
            <StudentFormDialog
              classroomId={classroomId}
              trigger={
                <Button size="sm">
                  <PlusIcon /> {t('classroomsAddStudentButton')}
                </Button>
              }
            />
          </CardHeader>
          <CardBody className="p-0">
            <TableContainer className="rounded-none border-0">
              <Table>
                <THead>
                  <TR>
                    <TH className="w-12 text-right">{t('classroomsColumnRowNumber')}</TH>
                    <TH className="w-40">{t('classroomsColumnStudentNo')}</TH>
                    <TH>{t('classroomsColumnName')}</TH>
                    <TH className="w-24 text-right">{t('classroomsColumnActions')}</TH>
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
                              <IconButton
                                label={t('classroomsEditStudentLabel')}
                                size="sm"
                              >
                                <EditIcon />
                              </IconButton>
                            }
                          />
                          <ConfirmDialog
                            title={t('classroomsRemoveStudentTitle')}
                            description={t('classroomsRemoveStudentDescription', {
                              name: studentFullName(student),
                            })}
                            confirmLabel={t('commonRemove')}
                            confirmPhrase={studentFullName(student)}
                            onConfirm={() => handleDeleteStudent(student.id)}
                            trigger={
                              <IconButton
                                label={t('classroomsRemoveStudentLabel')}
                                size="sm"
                                variant="danger"
                              >
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
          </CardBody>
        </Card>
      )}

      {total > STUDENTS_PAGE_SIZE && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-(--color-ink-muted)">
            {t('classroomsPaginationLabel', { current: page + 1, total: pageCount })}
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
    </div>
  )
}
