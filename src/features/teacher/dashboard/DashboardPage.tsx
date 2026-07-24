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
import { useAcademicPeriods } from '@/lib/queries/academicWorkspace'
import { useAllStudents } from '@/lib/queries/students'
import { useAllClassSessions } from '@/lib/queries/attendance'
import { computeStudentGradebook } from '@/lib/grading'
import { computeStudentSummary } from '@/features/teacher/attendance/summary'
import { useQueries } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { keys } from '@/lib/queries/keys'

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

  // Dynamically fetch each classroom's gradebook structure using useQueries so
  // the number of hooks can vary with the teacher's number of classrooms.
  const structureQueries = useQueries({
    queries: (classrooms ?? []).map((classroom) => ({
      queryKey: keys.grades.structure(classroom.id),
      enabled: !!classroom.id,
      queryFn: async () => {
        const periodsQ = supabase
          .from('grading_periods')
          .select('*')
          .eq('classroom_id', classroom.id)
          .order('position', { ascending: true })
          .order('name', { ascending: true })
        const activitiesQ = supabase
          .from('activities')
          .select('*, grading_periods!inner(classroom_id, course_subject_id)')
          .eq('grading_periods.classroom_id', classroom.id)
          .order('position', { ascending: true })
          .order('name', { ascending: true })

        const [components, periodsRes, categories, activitiesRes] = await Promise.all([
          supabase
            .from('grade_components')
            .select('*')
            .eq('classroom_id', classroom.id)
            .order('position', { ascending: true })
            .order('name', { ascending: true }),
          periodsQ,
          supabase
            .from('activity_categories')
            .select('*')
            .eq('classroom_id', classroom.id)
            .order('component', { ascending: true })
            .order('name', { ascending: true }),
          activitiesQ,
        ])

        if (periodsRes.error) throw periodsRes.error
        if (components.error) throw components.error
        if (categories.error) throw categories.error
        if (activitiesRes.error) throw activitiesRes.error

        const cleanActivities = (activitiesRes.data ?? []).map((row: any) => {
          const { grading_periods: _relation, ...activity } = row
          return activity
        })

        return {
          periods: (periodsRes.data ?? []) as any,
          components: (components.data ?? []) as any,
          categories: (categories.data ?? []) as any,
          activities: cleanActivities,
        }
      },
    })),
  })

  // Fetch score maps for every classroom (activityId -> studentId -> score).
  const scoresQueries = useQueries({
    queries: (classrooms ?? []).map((classroom, idx) => ({
      queryKey: keys.grades.byClassroom(classroom.id),
      enabled: !!classroom.id,
      queryFn: async () => {
        const structure = structureQueries[idx]?.data
        const activityIds: string[] = (structure?.activities ?? []).map((a: any) => a.id)
        if (!activityIds || activityIds.length === 0) return {}
        const { data, error } = await supabase
          .from('scores')
          .select('activity_id, student_id, score')
          .in('activity_id', activityIds)
        if (error) throw error
        const map: Record<string, Record<string, number | null>> = {}
        for (const row of data ?? []) {
          const bucket = (map[row.activity_id] ??= {})
          bucket[row.student_id] = row.score
        }
        return map
      },
    })),
  })

  // Build quick lookup maps keyed by classroom id.
  const structureByClassroom = React.useMemo(() => {
    const m = new Map<string, any>()
    ;(classrooms ?? []).forEach((c, i) => {
      const q = structureQueries[i]
      if (q?.data) m.set(c.id, q.data)
    })
    return m
  }, [classrooms, structureQueries.map((q) => q.data)])

  const scoresByClassroom = React.useMemo(() => {
    const m = new Map<string, Record<string, Record<string, number | null>>>()
    ;(classrooms ?? []).forEach((c, i) => {
      const q = scoresQueries[i]
      if (q?.data) m.set(c.id, q.data as any)
    })
    return m
  }, [classrooms, scoresQueries.map((q) => q.data)])

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
          const final = computeStudentGradebook(structure, scores, student.id).final
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
        className="grid gap-4 lg:grid-cols-[1fr]"
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

            <div className="mt-6">
              <p className="text-sm font-medium">
                Grade distribution (per classroom sample)
              </p>
              <p className="mt-1 text-sm text-(--color-ink-muted)">
                A simple bucketing of student finals rendered as small bars (no chart
                library).
              </p>
              <div className="mt-3 space-y-3">
                {(classrooms ?? []).slice(0, 3).map((classroom) => {
                  const studentsInClass = students.filter(
                    (s) => s.classroom_id === classroom.id,
                  )
                  const buckets: Record<string, number> = {
                    '90+': 0,
                    '80-89': 0,
                    '70-79': 0,
                    '60-69': 0,
                    '<60': 0,
                  }
                  let total = 0
                  for (const s of studentsInClass) {
                    const final = (studentGradeMap.get(s.id) as any)?.final
                    if (final === null || final === undefined) continue
                    total++
                    if (final >= 90) buckets['90+']++
                    else if (final >= 80) buckets['80-89']++
                    else if (final >= 70) buckets['70-79']++
                    else if (final >= 60) buckets['60-69']++
                    else buckets['<60']++
                  }
                  return (
                    <div
                      key={classroom.id}
                      className="rounded-md border border-(--color-border) bg-(--color-surface-0) p-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="truncate text-sm">{classroom.course_name}</div>
                        <div>
                          <button
                            type="button"
                            onClick={() =>
                              navigate({
                                to: '/teacher/classrooms/$classroomId/grades',
                                params: { classroomId: classroom.id },
                              })
                            }
                            className="text-(--color-accent-350) text-xs"
                          >
                            Grades
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-5 gap-2 items-end h-20">
                        {Object.entries(buckets).map(([label, count]) => {
                          const h =
                            total === 0
                              ? 4
                              : Math.max(4, Math.round((count / total) * 100))
                          return (
                            <div
                              key={label}
                              className="flex flex-col items-center text-[10px]"
                            >
                              <div
                                className="w-full bg-(--color-surface-3) h-full flex items-end rounded-md overflow-hidden"
                                style={{ height: '64px', width: '22px' }}
                              >
                                <div
                                  className="w-full bg-(--color-accent-400)"
                                  style={{ height: `${h}%` }}
                                />
                              </div>
                              <div className="mt-1">{count}</div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
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
