import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardBody } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { useProfile, useProfiles } from '@/lib/queries/profiles'
import { useClassrooms } from '@/lib/queries/classrooms'
import { useAllStudents } from '@/lib/queries/students'
import { useAllClassSessions } from '@/lib/queries/attendance'
import { useAllGradebooks } from '@/lib/queries/grades'
import { computeConfiguredPeriodFinalGrade, computeStudentGradebook } from '@/lib/grading'
import {
  computeClassAttendanceRate,
  formatRate,
} from '@/features/teacher/attendance/summary'

const ALL = '__all__'

function formatGrade(value: number | null): string {
  return value === null ? '—' : value.toFixed(1)
}

/** Mean of the non-null values, or null when nothing is graded. */
function mean(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

function DeltaBadge({
  current,
  previous,
}: {
  current: number | null
  previous: number | null
}) {
  if (current === null || previous === null) {
    return (
      <span className="text-xs text-(--color-ink-faint)">
        No comparable previous period
      </span>
    )
  }
  const delta = current - previous
  const flat = Math.abs(delta) < 0.05
  return (
    <span
      className={
        flat
          ? 'text-xs text-(--color-ink-muted)'
          : delta > 0
            ? 'text-xs text-(--color-success)'
            : 'text-xs text-(--color-danger)'
      }
    >
      {flat ? 'No change' : `${delta > 0 ? '+' : ''}${delta.toFixed(1)} vs previous`}
    </span>
  )
}

/**
 * School-wide overview for admins. Every hook here is the same one teachers
 * use — RLS (`is_admin()`) is what widens the result set to all classrooms, so
 * there is no separate admin query path to keep in sync.
 */
export function SchoolOverviewPage() {
  const navigate = useNavigate()
  const { data: profile, isLoading: profileLoading } = useProfile()
  const isAdmin = profile?.role === 'admin'

  useEffect(() => {
    if (!profileLoading && profile && !isAdmin) {
      navigate({ to: '/teacher/dashboard' })
    }
  }, [profileLoading, profile, isAdmin, navigate])

  const { data: classrooms = [], isLoading: classroomsLoading } = useClassrooms()
  const { data: profiles = [] } = useProfiles()
  const { data: students = [] } = useAllStudents()
  const { data: sessions = [] } = useAllClassSessions()

  const [teacherId, setTeacherId] = useState<string>(ALL)
  const [classroomId, setClassroomId] = useState<string>(ALL)
  const [periodName, setPeriodName] = useState<string>(ALL)

  const classroomIds = useMemo(() => classrooms.map((c) => c.id), [classrooms])
  const { gradebooks, isLoading: gradesLoading } = useAllGradebooks(classroomIds)

  // US-10 — filters. Selecting a teacher narrows the classroom list; a stale
  // classroom choice falls back to "all" rather than showing an empty page.
  const classroomsForTeacher = useMemo(
    () =>
      teacherId === ALL ? classrooms : classrooms.filter((c) => c.owner_id === teacherId),
    [classrooms, teacherId],
  )

  const scopedClassrooms = useMemo(() => {
    if (classroomId === ALL) return classroomsForTeacher
    const match = classroomsForTeacher.filter((c) => c.id === classroomId)
    return match.length > 0 ? match : classroomsForTeacher
  }, [classroomsForTeacher, classroomId])

  const scopedIds = useMemo(
    () => new Set(scopedClassrooms.map((c) => c.id)),
    [scopedClassrooms],
  )

  const periodNames = useMemo(() => {
    const names = new Set<string>()
    for (const [id, gradebook] of gradebooks) {
      if (!scopedIds.has(id)) continue
      for (const period of gradebook.structure.periods) names.add(period.name)
    }
    return [...names].sort((a, b) => a.localeCompare(b))
  }, [gradebooks, scopedIds])

  // Average grade for the scoped classrooms. When a period is selected we also
  // compute the period at `position - 1` for the trend; "previous" is derived
  // from position rather than dates because starts_on/ends_on are nullable.
  const grades = useMemo(() => {
    const current: number[] = []
    const previous: number[] = []

    for (const classroom of scopedClassrooms) {
      const gradebook = gradebooks.get(classroom.id)
      if (!gradebook) continue
      const roster = students.filter((s) => s.classroom_id === classroom.id)

      const period =
        periodName === ALL
          ? null
          : gradebook.structure.periods.find((p) => p.name === periodName)
      const priorPeriod = period
        ? gradebook.structure.periods.find((p) => p.position === period.position - 1)
        : null

      for (const student of roster) {
        try {
          const value = period
            ? computeConfiguredPeriodFinalGrade(
                gradebook.structure,
                gradebook.scores,
                student.id,
                period.id,
              )
            : computeStudentGradebook(gradebook.structure, gradebook.scores, student.id)
                .final
          if (value !== null) current.push(value)
        } catch {
          // A malformed structure shouldn't take the whole page down.
        }
        if (!priorPeriod) continue
        try {
          const prior = computeConfiguredPeriodFinalGrade(
            gradebook.structure,
            gradebook.scores,
            student.id,
            priorPeriod.id,
          )
          if (prior !== null) previous.push(prior)
        } catch {
          // ignore
        }
      }
    }

    return { current: mean(current), previous: mean(previous), graded: current.length }
  }, [scopedClassrooms, gradebooks, students, periodName])

  const attendance = useMemo(() => {
    const scoped = sessions.filter((s) => scopedIds.has(s.classroom_id))
    const records = scoped.flatMap((s) => s.attendance_records)
    return {
      rate: computeClassAttendanceRate(records),
      sessions: scoped.length,
    }
  }, [sessions, scopedIds])

  const studentCount = useMemo(
    () => scopedClassrooms.reduce((total, c) => total + c.student_count, 0),
    [scopedClassrooms],
  )

  const teacherOptions = useMemo(() => {
    const ownerIds = new Set(classrooms.map((c) => c.owner_id))
    return profiles
      .filter((p) => ownerIds.has(p.id))
      .sort((a, b) => (a.full_name || a.email).localeCompare(b.full_name || b.email))
  }, [profiles, classrooms])

  if (profileLoading || !isAdmin) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    )
  }

  const loading = classroomsLoading || gradesLoading

  return (
    <div className="space-y-6">
      <PageHeader
        title="School overview"
        description="Grades and attendance across every classroom."
      />

      <div className="flex flex-wrap gap-3">
        <div className="w-52">
          <Select
            value={teacherId}
            onValueChange={(value) => {
              setTeacherId(value)
              setClassroomId(ALL)
            }}
          >
            <SelectTrigger aria-label="Filter by teacher">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All teachers</SelectItem>
              {teacherOptions.map((teacher) => (
                <SelectItem key={teacher.id} value={teacher.id}>
                  {teacher.full_name || teacher.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-52">
          <Select value={classroomId} onValueChange={setClassroomId}>
            <SelectTrigger aria-label="Filter by classroom">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All classrooms</SelectItem>
              {classroomsForTeacher.map((classroom) => (
                <SelectItem key={classroom.id} value={classroom.id}>
                  {classroom.course_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-44">
          <Select value={periodName} onValueChange={setPeriodName}>
            <SelectTrigger aria-label="Grading period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All periods</SelectItem>
              {periodNames.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : classrooms.length === 0 ? (
        <EmptyState
          title="No classrooms yet"
          description="Once teachers create classrooms, school-wide stats appear here."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardBody>
              <p className="text-sm text-(--color-ink-muted)">Average grade</p>
              <p className="mt-1 text-2xl font-semibold">{formatGrade(grades.current)}</p>
              <div className="mt-1">
                <DeltaBadge current={grades.current} previous={grades.previous} />
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <p className="text-sm text-(--color-ink-muted)">Attendance rate</p>
              <p className="mt-1 text-2xl font-semibold">{formatRate(attendance.rate)}</p>
              <p className="mt-1 text-xs text-(--color-ink-faint)">
                {attendance.sessions} session{attendance.sessions === 1 ? '' : 's'}
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <p className="text-sm text-(--color-ink-muted)">Classrooms</p>
              <p className="mt-1 text-2xl font-semibold">{scopedClassrooms.length}</p>
              <p className="mt-1 text-xs text-(--color-ink-faint)">
                of {classrooms.length} school-wide
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <p className="text-sm text-(--color-ink-muted)">Students</p>
              <p className="mt-1 text-2xl font-semibold">{studentCount}</p>
              <p className="mt-1 text-xs text-(--color-ink-faint)">
                {grades.graded} graded
              </p>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  )
}
