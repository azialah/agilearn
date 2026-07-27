import { Link } from '@tanstack/react-router'
import {
  Archive,
  BookOpen,
  GraduationCap,
  MoreHorizontal,
  Plus,
  Sparkles,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
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
import { classroomColorClasses } from '@/lib/classroomColor'
import { ClassroomColorMenu } from './ClassroomColorMenu'
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
          // Hidden while empty — the empty state hosts the create CTA, so the
          // header button returns only once there are classrooms.
          profile &&
          (classrooms.data?.length ?? 0) > 0 && (
            <ClassroomFormDialog
              ownerId={profile.id}
              trigger={
                <Button>
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
          preview={
            <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
              {[0, 1].map((index) => (
                <div
                  key={index}
                  className="rounded-4xl border border-(--color-border) bg-(--color-surface-1) p-5 shadow-(--shadow-card)"
                >
                  <div className="h-5 w-2/3 rounded-full bg-(--color-surface-3)" />
                  <div className="mt-3 h-3 w-1/2 rounded-full bg-(--color-surface-2)" />
                  <div className="mt-5 space-y-2">
                    <div className="h-8 rounded-xl bg-(--color-surface-2)" />
                    <div className="h-8 w-5/6 rounded-xl bg-(--color-surface-2)" />
                  </div>
                </div>
              ))}
            </div>
          }
          action={
            profile && (
              <ClassroomFormDialog
                ownerId={profile.id}
                trigger={
                  <Button>
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
                className="overflow-hidden rounded-4xl border border-(--color-border) bg-(--color-surface-1) shadow-(--shadow-card)"
              >
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-(--color-border) px-5 py-4 sm:px-6">
                  <div>
                    <h2 className="font-semibold">
                      {period.semester_name} — SY {period.school_year}
                    </h2>
                    <p className="mt-1 text-xs text-(--color-ink-faint)">
                      {periodClassrooms.length} classroom
                      {periodClassrooms.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <Badge tone={period.status === 'active' ? 'success' : 'neutral'}>
                    {period.status === 'active' ? 'Active' : 'Archived'}
                  </Badge>
                </header>
                <div className="grid grid-cols-1 gap-4 p-4 sm:p-5 lg:grid-cols-2">
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
            <section className="rounded-4xl border border-dashed border-(--color-border-strong) p-5">
              <div className="mb-4 flex items-center gap-3">
                <span className="rounded-full bg-(--color-accent-400)/12 p-2 text-(--color-accent-350)">
                  <Archive className="size-4" />
                </span>
                <div>
                  <h2 className="font-medium">Imported classrooms</h2>
                  <p className="text-sm text-(--color-ink-muted)">
                    Organize legacy classes without changing their roster, scores, or
                    attendance.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {(classrooms.data ?? [])
                  .filter((classroom) => !classroom.academic_period_id)
                  .map((classroom) => (
                    <Card key={classroom.id}>
                      <CardBody className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{classroom.course_name}</p>
                          <p className="truncate text-xs text-(--color-ink-muted)">
                            {classroom.block || classroom.year || classroom.course_code}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0"
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
  const color = classroomColorClasses(classroom)
  return (
    <ClassroomColorMenu
      classroom={classroom}
      button={({ onClick }) => (
        <IconButton
          label={`Classroom options for ${classroom.cohort_name || classroom.course_name}`}
          size="sm"
          className="absolute right-3 top-3"
          onClick={onClick}
        >
          <MoreHorizontal className="size-4" />
        </IconButton>
      )}
    >
      <article className="relative overflow-hidden rounded-3xl border border-(--color-border) bg-(--color-surface-0) p-4 pl-5">
        {/* Colour lives on the edge, not behind the text — it stays legible in
          both themes and survives a narrow phone card. */}
        <span aria-hidden className={`absolute inset-y-0 left-0 w-1.5 ${color.edge}`} />
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-medium">
              {classroom.cohort_name || classroom.block || classroom.course_name}
            </h3>
            <p className="mt-1 text-xs text-(--color-ink-faint)">
              {classroom.year || 'Year level not set'} · {classroom.student_count}{' '}
              students
            </p>
          </div>
          <Badge className="mr-9">{subjects.length} subjects</Badge>
        </div>
        <div className="mt-4 space-y-2">
          {subjects.map((subject) => (
            <Link
              key={subject.id}
              to="/teacher/classrooms/$classroomId"
              params={{ classroomId: classroom.id }}
              className="group flex items-center justify-between gap-3 rounded-xl border border-(--color-border) bg-(--color-surface-1) px-3 py-3 transition hover:border-(--color-accent-400)"
            >
              <span className="flex min-w-0 items-center gap-2">
                <BookOpen className="size-4 shrink-0 text-(--color-accent-350)" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {subject.name}
                  </span>
                  <span className="block truncate text-xs text-(--color-ink-faint)">
                    {subject.course_code || subject.subject_code || subject.kind}
                  </span>
                </span>
              </span>
              <Badge tone="neutral">{subject.kind}</Badge>
            </Link>
          ))}
          {!subjects.length && (
            <p className="rounded-xl bg-(--color-surface-2) px-3 py-3 text-sm text-(--color-ink-muted)">
              No course subjects yet.
            </p>
          )}
        </div>
      </article>
    </ClassroomColorMenu>
  )
}
