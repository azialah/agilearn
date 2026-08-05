import { Link } from '@tanstack/react-router'
import React from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { useNavigate } from '@tanstack/react-router'
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
import { useAcademicPeriods, useAllCourseSubjects } from '@/lib/queries/academicWorkspace'
import { useAllStudents } from '@/lib/queries/students'
import { useAllClassSessions } from '@/lib/queries/attendance'
import {
  computeConfiguredStudentGradebook,
  type GradebookStructure,
  type ScoreMap,
} from '@/lib/grading'
import { computeStudentSummary } from '@/features/teacher/attendance/summary'
import { useAllGradebooks } from '@/lib/queries/grades'
import { GradeDistribution } from './GradeDistribution'

const rise = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }

export function DashboardPage() {
  const { data: profile } = useProfile()
  const { data: classrooms, isLoading } = useClassrooms()
  const { data: periods = [] } = useAcademicPeriods()
  const reducedMotion = useReducedMotion()
  const navigate = useNavigate()
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

  // Cross-classroom queries used by the dashboard widgets below. RLS on the
  // DB ensures teachers only see their own classrooms/students/sessions.
  const studentsQuery = useAllStudents()
  const allSessionsQuery = useAllClassSessions()
  const subjectsQuery = useAllCourseSubjects()

  // Structure + scores for every classroom, in one shared hook (RLS scopes the
  // reach). Replaces two hand-rolled `useQueries` blocks that duplicated
  // useGradebookStructure/useScores with `any` types.
  const classroomIds = React.useMemo(
    () => (classrooms ?? []).map((classroom) => classroom.id),
    [classrooms],
  )
  const singleSubjectClassroomIds = React.useMemo(() => {
    const counts = new Map<string, number>()
    for (const subject of subjectsQuery.data ?? []) {
      counts.set(subject.classroom_id, (counts.get(subject.classroom_id) ?? 0) + 1)
    }
    return classroomIds.filter((classroomId) => counts.get(classroomId) === 1)
  }, [classroomIds, subjectsQuery.data])
  // A classroom with multiple subjects has no implicit “one final”. Its
  // grade-sheet preview can show each subject or an explicitly saved combined
  // final, so the dashboard intentionally excludes it instead of merging data.
  const { gradebooks } = useAllGradebooks(singleSubjectClassroomIds)

  const structureByClassroom = React.useMemo(() => {
    const m = new Map<string, GradebookStructure>()
    gradebooks.forEach((gradebook, id) => m.set(id, gradebook.structure))
    return m
  }, [gradebooks])

  const scoresByClassroom = React.useMemo(() => {
    const m = new Map<string, ScoreMap>()
    gradebooks.forEach((gradebook, id) => m.set(id, gradebook.scores))
    return m
  }, [gradebooks])

  // Compute per-student final grade (when structure + scores exist) and
  // attendance summaries. Attendance will be scoped to each classroom's
  // grading_period date ranges when those dates are present. If a classroom
  // has no grading_period start/end dates the code falls back to the active
  // academic period, and finally to including all sessions.

  const students = studentsQuery.data ?? []
  const sessions = allSessionsQuery.data ?? []

  const studentGradeMap = React.useMemo(() => {
    const map = new Map<string, { final: number | null }>()
    for (const student of students) {
      const structure = structureByClassroom.get(student.classroom_id)
      const scores = scoresByClassroom.get(student.classroom_id) ?? {}
      if (structure) {
        try {
          const final = computeConfiguredStudentGradebook(
            structure,
            scores,
            student.id,
          ).final
          map.set(student.id, { final })
        } catch {
          map.set(student.id, { final: null })
        }
      } else {
        map.set(student.id, { final: null })
      }
    }
    return map
  }, [students, structureByClassroom, scoresByClassroom])

  const attendanceByStudent = React.useMemo(() => {
    // For each session, prefer scoping by that classroom's grading_period
    // date ranges (periods from the gradebook structure). If a classroom has
    // no period dates, fall back to the active academic period. If neither
    // is present, include the session.
    const inAnyPeriod = (sessionDate: string | undefined, classroomId?: string) => {
      if (!sessionDate) return false
      const d = new Date(sessionDate).getTime()

      const structure = classroomId ? structureByClassroom.get(classroomId) : undefined
      const periods: any[] = structure?.periods ?? []

      // If any grading period has explicit start/end, prefer those ranges
      const hasRange = periods.some((p) => p.starts_on || p.ends_on)
      if (hasRange) {
        for (const p of periods) {
          const start = p.starts_on
            ? new Date(`${p.starts_on}T00:00:00`).getTime()
            : -Infinity
          const end = p.ends_on ? new Date(`${p.ends_on}T23:59:59`).getTime() : Infinity
          if (d >= start && d <= end) return true
        }
        return false
      }

      // Fallback to active academic period when classroom periods have no dates
      if (activePeriod?.starts_on || activePeriod?.ends_on) {
        const start = activePeriod?.starts_on
          ? new Date(`${activePeriod.starts_on}T00:00:00`).getTime()
          : -Infinity
        const end = activePeriod?.ends_on
          ? new Date(`${activePeriod.ends_on}T23:59:59`).getTime()
          : Infinity
        return d >= start && d <= end
      }

      // As a last resort include the session
      return true
    }

    const byStudent = new Map<string, any[]>()
    for (const session of sessions) {
      // class_sessions include classroom_id; use it to scope by-classroom
      if (!inAnyPeriod(session.session_date, (session as any).classroom_id)) continue
      for (const rec of session.attendance_records ?? []) {
        const arr = byStudent.get(rec.student_id) ?? []
        arr.push({ status: rec.status })
        byStudent.set(rec.student_id, arr)
      }
    }
    return byStudent
  }, [sessions, activePeriod, structureByClassroom])

  const atRiskStudents = React.useMemo(() => {
    const out: Array<{
      id: string
      student: import('@/types/domain').Student
      classroomId: string
      final: number | null
      absentRate: number | null
    }> = []
    for (const student of students) {
      const gradeRow = studentGradeMap.get(student.id)
      const final = gradeRow?.final ?? null
      const records = attendanceByStudent.get(student.id) ?? []
      const summary = computeStudentSummary(student.id, records)
      const absentRate =
        summary.counted > 0 ? summary.counts.absent / summary.counted : null
      const lowGrade = final !== null && final < 70
      const highAbsence = absentRate !== null && absentRate > 0.2
      if (lowGrade || highAbsence) {
        out.push({
          id: student.id,
          student,
          classroomId: student.classroom_id,
          final,
          absentRate,
        })
      }
    }
    return out
  }, [students, studentGradeMap, attendanceByStudent])

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
        {/* Decorative only, and 2.3 MB of it. Async decode keeps a 2172px-wide
            PNG off the main thread, and low priority stops it competing with
            the fonts and JS that the dashboard actually needs to render.
            The real fix is re-encoding: it ships at 2172x724 but never renders
            wider than ~1100 CSS px. */}
        <img
          src="/images/home-teaching-ritual.png"
          alt=""
          decoding="async"
          fetchPriority="low"
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
        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
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
        className="grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr]"
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
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
              <div className="stagger-enter grid grid-cols-1 gap-3 sm:grid-cols-2">
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
        className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr]"
      >
        <Card>
          <CardBody>
            <p className="text-sm font-medium">At-risk students</p>
            <p className="mt-1 text-sm text-(--color-ink-muted)">
              Students with a weighted average below 70% or unexcused absence rate above
              20% in the selected scope.
            </p>

            <div className="mt-3 flex items-end justify-between gap-4">
              <div />
              <Link
                to="/teacher/analytics"
                search={{ atRisk: '1' }}
                className="text-sm text-(--color-accent-350)"
              >
                View all at-risk
              </Link>
            </div>

            {atRiskStudents.length === 0 ? (
              <p className="mt-4 text-sm text-(--color-ink-muted)">
                No students currently at risk
              </p>
            ) : (
              <ul className="mt-4 space-y-2">
                {atRiskStudents.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between rounded-md p-2 hover:bg-(--color-surface-2)"
                  >
                    <div>
                      <p className="text-sm font-medium truncate">
                        {r.student.last_name}, {r.student.first_name}
                      </p>
                      <p className="text-xs text-(--color-ink-muted)">
                        {r.student.student_no} ·{' '}
                        {classrooms?.find((c) => c.id === r.classroomId)?.course_name}
                      </p>
                    </div>
                    <div className="text-right text-xs tabular-nums">
                      <div>{r.final !== null ? `${Math.round(r.final)}%` : '—'}</div>
                      <div className="text-(--color-ink-muted)">
                        {r.absentRate !== null
                          ? `${Math.round(r.absentRate * 100)}% absent`
                          : 'No attendance'}
                      </div>
                      <div>
                        <button
                          type="button"
                          onClick={() =>
                            navigate({
                              to: '/teacher/classrooms/$classroomId/grades',
                              params: { classroomId: r.classroomId },
                              search: { studentId: r.id },
                            })
                          }
                          className="ml-3 text-(--color-accent-350) text-sm"
                        >
                          Open
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <GradeDistribution
              classrooms={classrooms ?? []}
              students={students}
              gradebooks={gradebooks}
            />
          </CardBody>
        </Card>
      </motion.section>

      <motion.section
        variants={rise}
        transition={{ duration: reducedMotion ? 0 : 0.32 }}
        className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr]"
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
