import { Link } from '@tanstack/react-router'
import { motion, useReducedMotion } from 'motion/react'
import {
  BookOpen,
  CalendarCheck,
  ChevronRight,
  ClipboardCheck,
  Plus,
  Upload,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { useClassrooms } from '@/lib/queries/classrooms'
import { useProfile } from '@/lib/queries/profiles'
import { useAcademicPeriods } from '@/lib/queries/academicWorkspace'

const rise = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }

export function DashboardPage() {
  const { data: profile } = useProfile()
  const { data: classrooms, isLoading } = useClassrooms()
  const { data: periods = [] } = useAcademicPeriods()
  const reducedMotion = useReducedMotion()
  const firstName = profile?.first_name || 'there'
  const totalStudents =
    classrooms?.reduce((total, classroom) => total + classroom.student_count, 0) ?? 0
  const completed =
    classrooms?.filter((classroom) => classroom.student_count > 0).length ?? 0
  const activePeriod = periods.find((period) => period.status === 'active')
  const daysRemaining = activePeriod?.ends_on
    ? Math.ceil(
        (new Date(`${activePeriod.ends_on}T23:59:59`).getTime() - Date.now()) / 86400000,
      )
    : null

  return (
    <motion.div
      initial="hidden"
      animate="show"
      transition={{ staggerChildren: reducedMotion ? 0 : 0.06 }}
      className="space-y-6 pb-20 lg:pb-0"
    >
      <motion.div variants={rise} transition={{ duration: reducedMotion ? 0 : 0.28 }}>
        <PageHeader
          title={
            <span className="inline-block pb-1 font-greeting text-4xl font-normal leading-[1.15] text-(--color-accent-350)">
              Good day, {firstName}
            </span>
          }
          description="Your teaching day, gathered in one calm place."
        />
      </motion.div>

      <motion.section
        variants={rise}
        transition={{ duration: reducedMotion ? 0 : 0.34 }}
        className="relative isolate overflow-hidden rounded-(--radius-xl) border border-(--color-border) bg-(--color-surface-1) shadow-(--shadow-card)"
      >
        <img
          src="/images/home-teaching-ritual.png"
          alt=""
          className="absolute inset-0 -z-10 h-full w-full object-cover object-[70%_center] opacity-80"
        />
        <div className="absolute inset-0 -z-10 bg-linear-to-r from-(--color-surface-1) via-(--color-surface-1)/92 to-transparent" />
        <div className="max-w-xl p-6 sm:p-8">
          <p className="font-[cursive] text-2xl text-(--color-accent-350)">
            A steady day of teaching.
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Start where your students need you most.
          </h2>
          <p className="mt-3 max-w-md text-sm leading-6 text-(--color-ink-muted)">
            Keep the roster close, grades clear, and materials ready for the next lesson.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link to="/teacher/classrooms">
              <Button>
                <Plus className="size-4" /> Create a class
              </Button>
            </Link>
            <Link to="/teacher/modules">
              <Button variant="outline">
                <Upload className="size-4" /> Add material
              </Button>
            </Link>
          </div>
        </div>
      </motion.section>

      <motion.div
        variants={rise}
        transition={{ duration: reducedMotion ? 0 : 0.3 }}
        className="grid gap-3 sm:grid-cols-3"
      >
        <Metric
          label="Active classes"
          value={isLoading ? '—' : String(classrooms?.length ?? 0)}
          detail="Your current teaching spaces"
        />
        <Metric
          label="Students"
          value={isLoading ? '—' : String(totalStudents)}
          detail="Across all your class rosters"
        />
        <Metric
          label="Class readiness"
          value={isLoading ? '—' : `${completed}/${classrooms?.length ?? 0}`}
          detail="Classes with a roster started"
        />
      </motion.div>

      <motion.div variants={rise} transition={{ duration: reducedMotion ? 0 : 0.28 }}>
        <Card className="rounded-3xl">
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">
                {activePeriod
                  ? `${activePeriod.semester_name} — SY ${activePeriod.school_year}`
                  : 'Set up your academic period'}
              </p>
              <p className="mt-1 text-sm text-(--color-ink-muted)">
                {daysRemaining === null
                  ? 'Add an end date to show how much teaching time remains.'
                  : daysRemaining >= 0
                    ? `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} until the semester ends.`
                    : 'This semester end date has passed—archive it when your records are complete.'}
              </p>
            </div>
            <Link to="/teacher/classrooms">
              <Button size="sm" variant="outline">
                Manage semesters
              </Button>
            </Link>
          </CardBody>
        </Card>
      </motion.div>

      <motion.section
        variants={rise}
        transition={{ duration: reducedMotion ? 0 : 0.32 }}
        className="grid gap-4 lg:grid-cols-[1.5fr_1fr]"
      >
        <Card>
          <CardBody className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Continue with a class</p>
                <p className="mt-1 text-sm text-(--color-ink-muted)">
                  Your recent teaching spaces and their next step.
                </p>
              </div>
              <Link
                to="/teacher/classrooms"
                className="text-sm text-(--color-accent-350)"
              >
                All classes
              </Link>
            </div>
            {isLoading ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </div>
            ) : !classrooms?.length ? (
              <EmptyState
                icon={<BookOpen />}
                title="Your first class is waiting"
                description="Set up a course, add a roster, then build the assessments that make your grading yours."
                action={
                  <Link to="/teacher/classrooms">
                    <Button size="sm">Create a class</Button>
                  </Link>
                }
              />
            ) : (
              <div className="stagger-enter grid gap-3 sm:grid-cols-2">
                {classrooms.slice(0, 4).map((classroom) => (
                  <Link
                    key={classroom.id}
                    to="/teacher/classrooms/$classroomId"
                    params={{ classroomId: classroom.id }}
                    className="group rounded-md border border-(--color-border) bg-(--color-surface-0) p-4 transition hover:-translate-y-0.5 hover:border-(--color-border-strong) hover:shadow-(--shadow-card)"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{classroom.course_name}</p>
                        <p className="mt-1 truncate text-xs text-(--color-ink-muted)">
                          {classroom.course_code} · {classroom.block}
                        </p>
                      </div>
                      <ChevronRight className="size-4 shrink-0 text-(--color-ink-faint)" />
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <Badge>{classroom.student_count} students</Badge>
                      <span className="text-xs text-(--color-ink-faint)">
                        {classroom.term_name || 'Term not set'}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardBody className="space-y-4">
            <div>
              <p className="text-sm font-medium">Today at a glance</p>
              <p className="mt-1 text-sm text-(--color-ink-muted)">
                Small nudges to keep your teaching flow moving.
              </p>
            </div>
            <AtGlance
              icon={<ClipboardCheck />}
              title="Assessment setup"
              detail={
                classrooms?.length
                  ? 'Open a class to build or review your grade breakdown.'
                  : 'Create a class, then choose a flexible grading template.'
              }
            />
            <AtGlance
              icon={<CalendarCheck />}
              title="Attendance"
              detail="Add a session whenever you are ready to take the room's pulse."
            />
            <AtGlance
              icon={<Upload />}
              title="Materials"
              detail="Keep your syllabus, lesson plans, and resources organized together."
            />
          </CardBody>
        </Card>
      </motion.section>

      <motion.section
        variants={rise}
        transition={{ duration: reducedMotion ? 0 : 0.32 }}
        className="grid gap-4 lg:grid-cols-[1.2fr_1fr]"
      >
        <Card>
          <CardBody>
            <p className="text-sm font-medium">Subject readiness</p>
            <p className="mt-1 text-sm text-(--color-ink-muted)">
              A quick view of the cohorts most ready to teach.
            </p>
            <div className="mt-5 space-y-4">
              {(classrooms ?? []).slice(0, 5).map((classroom) => {
                const readiness = Math.min(
                  100,
                  classroom.student_count > 0
                    ? 70 + Math.min(classroom.student_count, 15) * 2
                    : 28,
                )
                return (
                  <div key={classroom.id}>
                    <div className="mb-1.5 flex justify-between gap-3 text-xs">
                      <span className="truncate text-(--color-ink-muted)">
                        {classroom.cohort_name || classroom.block} ·{' '}
                        {classroom.course_name}
                      </span>
                      <span className="tabular-nums text-(--color-ink-faint)">
                        {readiness}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-(--color-surface-3)">
                      <div
                        className="h-full rounded-full bg-(--color-accent-400) transition-[width] duration-500"
                        style={{ width: `${readiness}%` }}
                      />
                    </div>
                  </div>
                )
              })}
              {!classrooms?.length && (
                <p className="text-sm text-(--color-ink-muted)">
                  Create a classroom to start measuring subject readiness.
                </p>
              )}
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm font-medium">Attendance rhythm</p>
            <p className="mt-1 text-sm text-(--color-ink-muted)">
              Recent sessions will appear here as attendance is recorded.
            </p>
            <Link
              to="/teacher/analytics"
              className="mt-5 inline-flex text-sm text-(--color-accent-350) hover:underline"
            >
              Open Analytics to view real attendance trends
            </Link>
          </CardBody>
        </Card>
      </motion.section>
    </motion.div>
  )
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail: string
}) {
  return (
    <Card>
      <CardBody>
        <p className="text-sm text-(--color-ink-muted)">{label}</p>
        <p className="mt-1 text-3xl font-semibold tracking-tight">{value}</p>
        <p className="mt-1 text-xs text-(--color-ink-faint)">{detail}</p>
      </CardBody>
    </Card>
  )
}
function AtGlance({
  icon,
  title,
  detail,
}: {
  icon: React.ReactNode
  title: string
  detail: string
}) {
  return (
    <div className="flex gap-3 rounded-md bg-(--color-surface-2) p-3">
      <span className="mt-0.5 text-(--color-accent-350) [&>svg]:size-4">{icon}</span>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-1 text-xs leading-5 text-(--color-ink-muted)">{detail}</p>
      </div>
    </div>
  )
}
