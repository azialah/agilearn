import { useMemo } from 'react'
import { BarChart3, TrendingUp } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { useAllCourseSubjects } from '@/lib/queries/academicWorkspace'
import { useMeetingSlots } from '@/lib/queries/calendar'
import { useAllClassSessions } from '@/lib/queries/attendance'
import { useModules } from '@/lib/queries/modules'
import { meetingMinutes, WEEKDAY_LABELS } from '@/features/teacher/calendar/calendar'

function Bar({
  label,
  value,
  max,
  detail,
}: {
  label: string
  value: number
  max: number
  detail: string
}) {
  const width = max ? Math.max(4, (value / max) * 100) : 0
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between gap-3 text-xs">
        <span className="truncate text-(--color-ink-muted)">{label}</span>
        <span className="shrink-0 font-medium text-(--color-ink)">{detail}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-(--color-surface-3)">
        <div
          className="h-full rounded-full bg-linear-to-r from-(--color-accent-350) to-(--color-accent-500)"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  )
}

export function AnalyticsPage() {
  const { data: subjects = [] } = useAllCourseSubjects()
  const { data: slots = [] } = useMeetingSlots()
  const { data: modules = [] } = useModules()
  const { data: sessions = [] } = useAllClassSessions()
  const weeklyLoad = useMemo(
    () =>
      WEEKDAY_LABELS.map((label, weekday) => ({
        label,
        minutes: slots
          .filter((slot) => slot.weekday === weekday)
          .reduce((sum, slot) => sum + meetingMinutes(slot.starts_at, slot.ends_at), 0),
      })),
    [slots],
  )
  const subjectLoad = useMemo(
    () =>
      subjects.map((subject) => ({
        subject,
        minutes: slots
          .filter((slot) => slot.course_subject_id === subject.id)
          .reduce((sum, slot) => sum + meetingMinutes(slot.starts_at, slot.ends_at), 0),
      })),
    [subjects, slots],
  )
  const attendanceRates = sessions
    .slice(0, 7)
    .reverse()
    .map((session) => ({
      label: new Date(`${session.session_date}T00:00`).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      }),
      rate: session.attendance_records.length
        ? Math.round(
            (session.attendance_records.filter((record) => record.status !== 'absent')
              .length /
              session.attendance_records.length) *
              100,
          )
        : 0,
    }))
  const maxMinutes = Math.max(
    1,
    ...weeklyLoad.map((item) => item.minutes),
    ...subjectLoad.map((item) => item.minutes),
  )
  const readiness = subjects.map((subject) => ({
    subject,
    value: Math.min(
      100,
      (slots.some((slot) => slot.course_subject_id === subject.id) ? 34 : 0) +
        (modules.some((module) => module.classroom_id === subject.classroom_id)
          ? 33
          : 0) +
        (sessions.some((session) => session.course_subject_id === subject.id) ? 33 : 0),
    ),
  }))
  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Teaching signals from your real schedules, attendance sessions, and materials."
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-[1.75rem] p-5">
          <BarChart3 className="size-5 text-(--color-accent-350)" />
          <p className="mt-4 text-3xl font-semibold">
            {Math.round(
              (weeklyLoad.reduce((sum, item) => sum + item.minutes, 0) / 60) * 10,
            ) / 10}
            h
          </p>
          <p className="mt-1 text-sm text-(--color-ink-muted)">
            scheduled this week
          </p>
        </Card>
        <Card className="rounded-[1.75rem] p-5">
          <TrendingUp className="size-5 text-(--color-accent-350)" />
          <p className="mt-4 text-3xl font-semibold">{subjects.length}</p>
          <p className="mt-1 text-sm text-(--color-ink-muted)">
            active course subjects
          </p>
        </Card>
        <Card className="rounded-[1.75rem] p-5">
          <p className="font-(family-name:--font-calligraphy) text-2xl text-(--color-accent-350)">
            A clear week ahead
          </p>
          <p className="mt-2 text-sm text-(--color-ink-muted)">
            Insights appear as your schedule, attendance, and materials grow.
          </p>
        </Card>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="rounded-4xl p-6">
          <h2 className="font-semibold">Weekly teaching load</h2>
          <p className="mt-1 text-sm text-(--color-ink-muted)">
            Sunday-first scheduled minutes.
          </p>
          <div className="mt-6 space-y-4">
            {weeklyLoad.map((item) => (
              <Bar
                key={item.label}
                label={item.label}
                value={item.minutes}
                max={maxMinutes}
                detail={`${item.minutes} min`}
              />
            ))}
          </div>
        </Card>
        <Card className="rounded-4xl p-6">
          <h2 className="font-semibold">Subject readiness</h2>
          <p className="mt-1 text-sm text-(--color-ink-muted)">
            Schedule, materials, and recorded attendance.
          </p>
          <div className="mt-6 space-y-4">
            {readiness.length ? (
              readiness.map((item) => (
                <Bar
                  key={item.subject.id}
                  label={item.subject.name}
                  value={item.value}
                  max={100}
                  detail={`${item.value}%`}
                />
              ))
            ) : (
              <p className="text-sm text-(--color-ink-muted)">
                Create a course subject to see readiness signals here.
              </p>
            )}
          </div>
        </Card>
        <Card className="rounded-4xl p-6 lg:col-span-2">
          <h2 className="font-semibold">Attendance trend</h2>
          <p className="mt-1 text-sm text-(--color-ink-muted)">
            Present, late, and excused learners across recorded sessions.
          </p>
          {attendanceRates.length ? (
            <div className="mt-6 flex h-40 items-end gap-3 border-b border-(--color-border) px-2">
              {attendanceRates.map((item) => (
                <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
                  <div
                    className="w-full rounded-t-xl bg-linear-to-t from-(--color-accent-350) to-(--color-accent-500)"
                    style={{ height: `${Math.max(6, item.rate)}%` }}
                    title={`${item.label}: ${item.rate}%`}
                  />
                  <span className="text-[10px] text-(--color-ink-faint)">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-6 rounded-xl bg-(--color-surface-2) p-4 text-sm text-(--color-ink-muted)">
              Record attendance from a subject workspace to build this trend. No sample
              attendance is displayed.
            </p>
          )}
        </Card>
      </div>
      <Card className="rounded-4xl p-6">
        <h2 className="font-semibold">Course load</h2>
        <div className="mt-5 space-y-4">
          {subjectLoad.length ? (
            subjectLoad.map((item) => (
              <Bar
                key={item.subject.id}
                label={item.subject.name}
                value={item.minutes}
                max={maxMinutes}
                detail={`${item.minutes} min/week`}
              />
            ))
          ) : (
            <p className="text-sm text-(--color-ink-muted)">
              No subject schedules yet.
            </p>
          )}
        </div>
      </Card>
    </div>
  )
}
