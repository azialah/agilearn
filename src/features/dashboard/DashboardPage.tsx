import { Link } from '@tanstack/react-router'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { ChevronRightIcon, ClassroomIcon } from '@/components/icons'
import { useProfile } from '@/lib/queries/profiles'
import { useClassrooms } from '@/lib/queries/classrooms'

export function DashboardPage() {
  const { data: profile } = useProfile()
  const { data: classrooms, isLoading } = useClassrooms()

  const firstName = profile?.full_name?.split(' ')[0] || 'there'
  const totalStudents = classrooms?.reduce((sum, c) => sum + c.student_count, 0) ?? 0

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description="Here's a quick look at your classrooms."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardBody>
            <p className="text-sm text-[var(--color-ink-muted)]">Classrooms</p>
            <p className="mt-1 text-3xl font-semibold">
              {isLoading ? '—' : (classrooms?.length ?? 0)}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm text-[var(--color-ink-muted)]">Students</p>
            <p className="mt-1 text-3xl font-semibold">
              {isLoading ? '—' : totalStudents}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex h-full flex-col justify-between gap-3">
            <p className="text-sm text-[var(--color-ink-muted)]">Quick actions</p>
            <Link to="/classrooms">
              <Button variant="secondary" size="sm" className="w-full">
                Manage classrooms
              </Button>
            </Link>
          </CardBody>
        </Card>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-[var(--color-ink-muted)]">
            Recent classrooms
          </h2>
          <Link
            to="/classrooms"
            className="text-sm text-[var(--color-accent-350)] hover:underline"
          >
            View all
          </Link>
        </div>

        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : !classrooms || classrooms.length === 0 ? (
          <EmptyState
            icon={<ClassroomIcon />}
            title="No classrooms yet"
            description="Create your first classroom to get started."
            action={
              <Link to="/classrooms">
                <Button size="sm">Go to classrooms</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {classrooms.slice(0, 4).map((classroom) => (
              <Link
                key={classroom.id}
                to="/classrooms/$classroomId"
                params={{ classroomId: classroom.id }}
              >
                <Card className="transition-colors hover:border-[var(--color-border-strong)]">
                  <CardBody className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{classroom.course_name}</p>
                      <p className="mt-0.5 truncate text-sm text-[var(--color-ink-muted)]">
                        {classroom.course_code} · {classroom.year} · {classroom.block}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge>{classroom.student_count} students</Badge>
                      <ChevronRightIcon className="text-[var(--color-ink-faint)]" />
                    </div>
                  </CardBody>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
