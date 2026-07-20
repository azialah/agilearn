import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { ChevronRightIcon, ClassroomIcon } from '@/components/icons'
import { useProfile } from '@/lib/queries/profiles'
import { useClassrooms } from '@/lib/queries/classrooms'
import { useLocale } from '@/lib/locale'
import { CheckCircle2, GraduationCap, Layers3 } from 'lucide-react'

export function DashboardPage() {
  const { data: profile } = useProfile()
  const { data: classrooms, isLoading } = useClassrooms()
  const { t } = useLocale()

  const firstName = profile?.first_name || 'there'
  const totalStudents = classrooms?.reduce((sum, c) => sum + c.student_count, 0) ?? 0

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('welcomeBack').replace('{name}', firstName)}
        description={t('dashboardDescription')}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardBody>
            <p className="text-sm text-[var(--color-ink-muted)]">{t('classrooms')}</p>
            <p className="mt-1 text-3xl font-semibold">
              {isLoading ? '—' : (classrooms?.length ?? 0)}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm text-[var(--color-ink-muted)]">{t('students')}</p>
            <p className="mt-1 text-3xl font-semibold">
              {isLoading ? '—' : totalStudents}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex h-full flex-col justify-between gap-3">
            <p className="text-sm text-[var(--color-ink-muted)]">{t('quickActions')}</p>
            <Link to="/teacher/classrooms">
              <Button variant="secondary" size="sm" className="w-full">
                {t('manageClassrooms')}
              </Button>
            </Link>
          </CardBody>
        </Card>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-[var(--color-ink-muted)]">
            {t('recentClassrooms')}
          </h2>
          <Link
            to="/teacher/classrooms"
            className="text-sm text-[var(--color-accent-350)] hover:underline"
          >
            {t('viewAll')}
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
            title={t('noClassrooms')}
            description={t('noClassroomsDescription')}
            action={
              <Link to="/teacher/classrooms">
                <Button size="sm">{t('goToClassrooms')}</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {classrooms.slice(0, 4).map((classroom) => (
              <Link
                key={classroom.id}
                to="/teacher/classrooms/$classroomId"
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

      {!isLoading && (!classrooms || classrooms.length === 0) && (
        <section className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
          <Card>
            <CardBody className="flex h-full flex-col justify-between gap-5">
              <div>
                <p className="text-sm font-medium text-[var(--color-ink-muted)]">
                  Your first teaching flow
                </p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight">
                  Build a calm home base for every class.
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--color-ink-muted)]">
                  Start with one classroom, then add your roster and the materials you
                  return to every week.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <SetupItem
                  icon={<GraduationCap />}
                  label="Create a classroom"
                  detail="Set course and section"
                />
                <SetupItem
                  icon={<CheckCircle2 />}
                  label="Add your students"
                  detail="Build your roster"
                />
                <SetupItem
                  icon={<Layers3 />}
                  label="Collect materials"
                  detail="Keep modules together"
                />
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="flex h-full flex-col justify-between gap-5">
              <div>
                <p className="text-sm font-medium text-[var(--color-ink-muted)]">
                  Workspace readiness
                </p>
                <p className="mt-2 text-4xl font-semibold">
                  0<span className="text-lg text-[var(--color-ink-muted)]"> / 3</span>
                </p>
                <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
                  Complete the first three essentials to make Agilearn useful from day
                  one.
                </p>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--color-surface-3)]">
                <div className="h-full w-0 rounded-full bg-[var(--color-accent-400)]" />
              </div>
            </CardBody>
          </Card>
        </section>
      )}
    </div>
  )
}

function SetupItem({
  icon,
  label,
  detail,
}: {
  icon: ReactNode
  label: string
  detail: string
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
      <div className="text-[var(--color-accent-350)] [&>svg]:size-4">{icon}</div>
      <p className="mt-3 text-sm font-medium">{label}</p>
      <p className="mt-1 text-xs text-[var(--color-ink-muted)]">{detail}</p>
    </div>
  )
}
