import { Link } from '@tanstack/react-router'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/toast'
import { ClassroomIcon, EditIcon, PlusIcon, TrashIcon } from '@/components/icons'
import { useProfile } from '@/lib/queries/profiles'
import { useClassrooms, useDeleteClassroom } from '@/lib/queries/classrooms'
import { ClassroomFormDialog } from './ClassroomFormDialog'

export function ClassroomsPage() {
  const { data: profile } = useProfile()
  const { data: classrooms, isLoading } = useClassrooms()
  const deleteClassroom = useDeleteClassroom()
  const { toast } = useToast()

  async function handleDelete(id: string) {
    try {
      await deleteClassroom.mutateAsync(id)
      toast({ title: 'Classroom deleted', tone: 'success' })
    } catch (error) {
      toast({
        title: 'Could not delete classroom',
        description: error instanceof Error ? error.message : undefined,
        tone: 'error',
      })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Classrooms"
        description="Manage your courses and rosters."
        actions={
          profile && (
            <ClassroomFormDialog
              ownerId={profile.id}
              trigger={
                <Button>
                  <PlusIcon /> New classroom
                </Button>
              }
            />
          )
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : !classrooms || classrooms.length === 0 ? (
        <EmptyState
          icon={<ClassroomIcon />}
          title="No classrooms yet"
          description="Create your first classroom to start adding students and grades."
          action={
            profile && (
              <ClassroomFormDialog
                ownerId={profile.id}
                trigger={
                  <Button>
                    <PlusIcon /> New classroom
                  </Button>
                }
              />
            )
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classrooms.map((classroom) => (
            <Card key={classroom.id} className="flex flex-col">
              <CardBody className="flex flex-1 flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    to="/teacher/classrooms/$classroomId"
                    params={{ classroomId: classroom.id }}
                    className="min-w-0 flex-1"
                  >
                    <p className="truncate font-medium hover:text-[var(--color-accent-300)]">
                      {classroom.course_name}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-[var(--color-ink-muted)]">
                      {classroom.course_code} · {classroom.year} · {classroom.block}
                    </p>
                  </Link>
                  <div className="flex items-center gap-1">
                    {profile && (
                      <ClassroomFormDialog
                        ownerId={profile.id}
                        classroom={classroom}
                        trigger={
                          <IconButton label="Edit classroom" size="sm">
                            <EditIcon />
                          </IconButton>
                        }
                      />
                    )}
                    <ConfirmDialog
                      title="Delete classroom?"
                      description={`This permanently removes "${classroom.course_name}" and all of its students, grades, and attendance.`}
                      onConfirm={() => handleDelete(classroom.id)}
                      trigger={
                        <IconButton label="Delete classroom" size="sm" variant="danger">
                          <TrashIcon />
                        </IconButton>
                      }
                    />
                  </div>
                </div>

                <div className="mt-auto flex items-center justify-between">
                  <Badge>{classroom.student_count} students</Badge>
                  <span className="text-xs text-[var(--color-ink-faint)]">
                    Lec {classroom.lecture_weight} · Lab {classroom.laboratory_weight}
                  </span>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
