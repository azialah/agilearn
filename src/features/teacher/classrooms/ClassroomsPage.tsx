import { Link } from '@tanstack/react-router'
import { Archive, BookOpen, GraduationCap, Plus, Sparkles } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/toast'
import { useProfile } from '@/lib/queries/profiles'
import { useClassrooms } from '@/lib/queries/classrooms'
import {
  useAcademicPeriods,
  useAdoptLegacyClassroom,
  useAllCourseSubjects,
} from '@/lib/queries/academicWorkspace'
import { ClassroomFormDialog } from './ClassroomFormDialog'

export function ClassroomsPage() {
  const { data: profile } = useProfile()
  const classrooms = useClassrooms()
  const periods = useAcademicPeriods()
  const subjects = useAllCourseSubjects()
  const adopt = useAdoptLegacyClassroom()
  const { toast } = useToast()
  const loading = classrooms.isLoading || periods.isLoading || subjects.isLoading

  async function adoptClassroom(classroomId: string) {
    try {
      await adopt.mutateAsync(classroomId)
      toast({ title: 'Classroom organized into the academic workspace', tone: 'success' })
    } catch (error) {
      toast({
        title: 'Could not organize classroom',
        description: error instanceof Error ? error.message : undefined,
        tone: 'error',
      })
    }
  }

  return (
    <div className="space-y-7">
      <PageHeader
        title="Classrooms"
        description="School Year and Semester first, then cohorts and their course subjects."
        actions={
          profile && (
            <ClassroomFormDialog
              ownerId={profile.id}
              trigger={
                <Button className="rounded-full">
                  <Plus className="size-4" /> New classroom
                </Button>
              }
            />
          )
        }
      />

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
        </div>
      ) : !classrooms.data?.length ? (
        <EmptyState
          icon={<GraduationCap />}
          title="Create your first teaching context"
          description="Start with a School Year and Semester, add a classroom cohort, then create its course subjects."
          action={
            profile && (
              <ClassroomFormDialog
                ownerId={profile.id}
                trigger={
                  <Button className="rounded-full">
                    <Plus className="size-4" /> Create classroom
                  </Button>
                }
              />
            )
          }
        />
      ) : (
        <div className="space-y-6">
          {(periods.data ?? []).map((period) => {
            const periodClassrooms =
              classrooms.data?.filter(
                (classroom) => classroom.academic_period_id === period.id,
              ) ?? []
            if (!periodClassrooms.length) return null
            return (
              <section
                key={period.id}
                className="overflow-hidden rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-surface-1)] shadow-[var(--shadow-card)]"
              >
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] px-5 py-4 sm:px-6">
                  <div>
                    <h2 className="font-semibold">
                      {period.semester_name} — SY {period.school_year}
                    </h2>
                    <p className="mt-1 text-xs text-[var(--color-ink-faint)]">
                      {periodClassrooms.length} classroom
                      {periodClassrooms.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <Badge tone={period.status === 'active' ? 'success' : 'neutral'}>
                    {period.status === 'active' ? 'Active' : 'Archived'}
                  </Badge>
                </header>
                <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-2">
                  {periodClassrooms.map((classroom) => {
                    const classroomSubjects = (subjects.data ?? []).filter(
                      (subject) => subject.classroom_id === classroom.id,
                    )
                    return (
                      <ClassroomGroup
                        key={classroom.id}
                        classroom={classroom}
                        subjects={classroomSubjects}
                      />
                    )
                  })}
                </div>
              </section>
            )
          })}

          {(classrooms.data ?? []).some((classroom) => !classroom.academic_period_id) && (
            <section className="rounded-[2rem] border border-dashed border-[var(--color-border-strong)] p-5">
              <div className="mb-4 flex items-center gap-3">
                <span className="rounded-full bg-[var(--color-accent-400)]/12 p-2 text-[var(--color-accent-350)]">
                  <Archive className="size-4" />
                </span>
                <div>
                  <h2 className="font-medium">Imported classrooms</h2>
                  <p className="text-sm text-[var(--color-ink-muted)]">
                    Organize legacy classes without changing their roster, scores, or
                    attendance.
                  </p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {(classrooms.data ?? [])
                  .filter((classroom) => !classroom.academic_period_id)
                  .map((classroom) => (
                    <Card key={classroom.id}>
                      <CardBody className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{classroom.course_name}</p>
                          <p className="truncate text-xs text-[var(--color-ink-muted)]">
                            {classroom.block || classroom.year || classroom.course_code}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0 rounded-full"
                          loading={adopt.isPending}
                          onClick={() => void adoptClassroom(classroom.id)}
                        >
                          <Sparkles className="size-4" /> Organize
                        </Button>
                      </CardBody>
                    </Card>
                  ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function ClassroomGroup({
  classroom,
  subjects,
}: {
  classroom: NonNullable<ReturnType<typeof useClassrooms>['data']>[number]
  subjects: NonNullable<ReturnType<typeof useAllCourseSubjects>['data']>
}) {
  return (
    <article className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface-0)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium">
            {classroom.cohort_name || classroom.block || classroom.course_name}
          </h3>
          <p className="mt-1 text-xs text-[var(--color-ink-faint)]">
            {classroom.year || 'Year level not set'} · {classroom.student_count} students
          </p>
        </div>
        <Badge>{subjects.length} subjects</Badge>
      </div>
      <div className="mt-4 space-y-2">
        {subjects.map((subject) => (
          <Link
            key={subject.id}
            to="/teacher/classrooms/$classroomId"
            params={{ classroomId: classroom.id }}
            className="group flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 py-3 transition hover:border-[var(--color-accent-400)]"
          >
            <span className="flex min-w-0 items-center gap-2">
              <BookOpen className="size-4 shrink-0 text-[var(--color-accent-350)]" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{subject.name}</span>
                <span className="block truncate text-xs text-[var(--color-ink-faint)]">
                  {subject.course_code || subject.subject_code || subject.kind}
                </span>
              </span>
            </span>
            <Badge tone="neutral">{subject.kind}</Badge>
          </Link>
        ))}
        {!subjects.length && (
          <p className="rounded-xl bg-[var(--color-surface-2)] px-3 py-3 text-sm text-[var(--color-ink-muted)]">
            No course subjects yet.
          </p>
        )}
      </div>
    </article>
  )
}
