import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, CalendarDays, MapPin } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import {
  ResponsiveDrawer,
  ResponsiveDrawerBody,
  ResponsiveDrawerContent,
  ResponsiveDrawerFooter,
  ResponsiveDrawerHeader,
} from '@/components/ui/ResponsiveDrawer'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/cn'
import { useProfile } from '@/lib/queries/profiles'
import { useAcademicPeriods, useAllCourseSubjects } from '@/lib/queries/academicWorkspace'
import { useClassrooms } from '@/lib/queries/classrooms'
import {
  useCalendarEvents,
  useCreateCalendarEvent,
  useMeetingSlots,
} from '@/lib/queries/calendar'
import { cn } from '@/lib/cn'
import type { CalendarEvent, SubjectMeetingSlot } from '@/types/domain'
import { addDays, startOfSundayWeek, toDateKey, WEEKDAY_LABELS } from './calendar'

const MONTHS = Array.from({ length: 12 }, (_value, index) =>
  new Date(2026, index).toLocaleString(undefined, { month: 'long' }),
)

const MODALITY_LABEL = {
  online: 'Online',
  hybrid: 'Hybrid',
} as const

/**
 * One scheduled class. `compact` is the lg+ week grid, where a 10px type size
 * is what keeps a slot readable inside a single column; the stacked mobile
 * list has the width to use the normal 12px scale.
 */
function SlotCard({
  slot,
  subjectName,
  compact = false,
}: {
  slot: SubjectMeetingSlot
  subjectName: string
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-(--color-border) bg-(--color-surface-2) p-2',
        compact ? 'mb-2 text-[10px]' : 'text-xs',
      )}
    >
      <p className="truncate font-semibold text-(--color-ink)">{subjectName}</p>
      <p className="mt-1 text-(--color-ink-muted)">
        {slot.starts_at.slice(0, 5)}–{slot.ends_at.slice(0, 5)}
      </p>
      <p className="mt-1 truncate text-(--color-accent-350)">
        {MODALITY_LABEL[slot.modality as keyof typeof MODALITY_LABEL] ?? 'Face-to-face'}
      </p>
    </div>
  )
}

function EventCard({
  event,
  compact = false,
}: {
  event: CalendarEvent
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-xl bg-(--color-accent-400)/12 p-2 text-(--color-ink)',
        compact ? 'mb-2 text-[10px]' : 'text-xs',
      )}
    >
      <p className="truncate font-medium">{event.title}</p>
      <p className="mt-1 text-(--color-ink-muted)">
        {event.kind === 'holiday' ? 'Holiday' : event.kind === 'note' ? 'Note' : 'Event'}
      </p>
    </div>
  )
}

export function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const { data: profile } = useProfile()
  const { data: subjects = [] } = useAllCourseSubjects()
  const { data: allSlots = [] } = useMeetingSlots()
  const { data: classrooms = [] } = useClassrooms()
  const { data: periods = [] } = useAcademicPeriods()

  // Slots from archived semesters would otherwise keep showing on every week.
  const slots = useMemo(() => {
    const activePeriods = new Set(
      periods.filter((period) => period.status === 'active').map((period) => period.id),
    )
    const activeClassrooms = new Set(
      classrooms
        .filter(
          (classroom) =>
            !classroom.academic_period_id ||
            activePeriods.has(classroom.academic_period_id),
        )
        .map((classroom) => classroom.id),
    )
    const activeSubjectIds = new Set(
      subjects
        .filter((subject) => activeClassrooms.has(subject.classroom_id))
        .map((subject) => subject.id),
    )
    return allSlots.filter((slot) => activeSubjectIds.has(slot.course_subject_id))
  }, [allSlots, subjects, classrooms, periods])
  const weekStart = startOfSundayWeek(selectedDate)
  const weekEnd = addDays(weekStart, 7)
  const events = useCalendarEvents(weekStart.toISOString(), weekEnd.toISOString())
  const createEvent = useCreateCalendarEvent()
  const { toast } = useToast()
  const days = useMemo(
    () => Array.from({ length: 7 }, (_value, index) => addDays(weekStart, index)),
    [weekStart],
  )
  const today = toDateKey(new Date())
  const selectedKey = toDateKey(selectedDate)

  async function saveDayNote() {
    if (!profile || !title.trim()) return
    try {
      const starts = new Date(`${selectedKey}T09:00`).toISOString()
      await createEvent.mutateAsync({
        owner_id: profile.id,
        title: title.trim(),
        notes: notes.trim(),
        kind: 'note',
        visibility: 'private',
        starts_at: starts,
        all_day: true,
      })
      setTitle('')
      setNotes('')
      setDrawerOpen(false)
      toast({ title: 'Day note saved', tone: 'success' })
    } catch (error) {
      toast({
        title: 'Could not save note',
        description: error instanceof Error ? error.message : undefined,
        tone: 'error',
      })
    }
  }

  const selectedEvents = (events.data ?? []).filter(
    (event) => toDateKey(new Date(event.starts_at)) === selectedKey,
  )
  const selectedSlots = slots.filter((slot) => slot.weekday === selectedDate.getDay())

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar"
        description="A Sunday-first view of your weekly teaching load, school dates, and private planning notes."
        actions={
          <Button onClick={() => setDrawerOpen(true)}>
            <Plus className="size-4" /> Add day note
          </Button>
        }
      />
      {/* Below lg the three groups don't fit on one line, so the week label
          takes its own row and nav + pickers share the next. `lg:order-*`
          restores the original single-row order untouched. */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-(--color-border) bg-(--color-surface-1) p-3">
        <div className="order-2 flex items-center gap-2 lg:order-1">
          <Button
            size="sm"
            variant="ghost"
            aria-label="Previous week"
            onClick={() => setSelectedDate(addDays(selectedDate, -7))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedDate(new Date())}>
            Today
          </Button>
          <Button
            size="sm"
            variant="ghost"
            aria-label="Next week"
            onClick={() => setSelectedDate(addDays(selectedDate, 7))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <p className="order-1 w-full text-sm font-semibold text-(--color-ink) lg:order-2 lg:w-auto">
          {weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} –{' '}
          {addDays(weekStart, 6).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>
        <div className="order-3 flex gap-2">
          <select
            aria-label="Calendar month"
            value={selectedDate.getMonth()}
            onChange={(event) =>
              setSelectedDate(
                new Date(selectedDate.getFullYear(), Number(event.target.value), 1),
              )
            }
            className="h-9 rounded-full border border-(--color-border) bg-(--color-surface-0) px-3 text-sm"
          >
            {MONTHS.map((month, index) => (
              <option key={month} value={index}>
                {month}
              </option>
            ))}
          </select>
          <select
            aria-label="Calendar year"
            value={selectedDate.getFullYear()}
            onChange={(event) =>
              setSelectedDate(
                new Date(Number(event.target.value), selectedDate.getMonth(), 1),
              )
            }
            className="h-9 rounded-full border border-(--color-border) bg-(--color-surface-0) px-3 text-sm"
          >
            {[-1, 0, 1, 2].map((offset) => {
              const year = new Date().getFullYear() + offset
              return <option key={year}>{year}</option>
            })}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <Card className="overflow-hidden rounded-4xl p-0">
          <div className="grid grid-cols-7 border-b border-(--color-border)">
            {days.map((day, index) => {
              const key = toDateKey(day)
              const active = key === selectedKey
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDate(day)}
                  className={
                    'min-h-20 border-r border-(--color-border) p-3 text-left last:border-r-0 ' +
                    (active
                      ? 'bg-(--color-accent-400)/12'
                      : 'hover:bg-(--color-surface-2)')
                  }
                >
                  <span className="block text-[10px] font-semibold uppercase tracking-wide text-(--color-ink-faint)">
                    {WEEKDAY_LABELS[index]}
                  </span>
                  <span
                    className={
                      'mt-1 inline-flex size-7 items-center justify-center rounded-full text-sm ' +
                      (key === today
                        ? 'bg-(--color-accent-400) text-(--color-accent-fg)'
                        : 'text-(--color-ink)')
                    }
                  >
                    {day.getDate()}
                  </span>
                </button>
              )
            })}
          </div>
          <div className="grid min-h-104 grid-cols-7">
            {days.map((day) => {
              const daySlots = slots.filter((slot) => slot.weekday === day.getDay())
              const dayEvents = (events.data ?? []).filter(
                (event) => toDateKey(new Date(event.starts_at)) === toDateKey(day),
              )
              return (
                <div
                  key={toDateKey(day)}
                  className="min-w-0 border-r border-(--color-border) p-2 last:border-r-0"
                >
                  {daySlots.map((slot) => {
                    const subject = subjects.find(
                      (item) => item.id === slot.course_subject_id,
                    )
                    return (
                      <div
                        key={slot.id}
                        className="mb-2 rounded-xl border border-(--color-border) bg-(--color-surface-2) p-2 text-[10px]"
                      >
                        <p className="truncate font-semibold text-(--color-ink)">
                          {subject?.name ?? 'Course subject'}
                        </p>
                        <p className="mt-1 text-(--color-ink-muted)">
                          {slot.starts_at.slice(0, 5)}–{slot.ends_at.slice(0, 5)}
                        </p>
                        <p className="mt-1 truncate text-(--color-accent-350)">
                          {slot.modality === 'online'
                            ? 'Online'
                            : slot.modality === 'hybrid'
                              ? 'Hybrid'
                              : 'Face-to-face'}
                        </p>
                      </div>
                    )
                  })}
                  {dayEvents.map((event) => (
                    <div
                      key={event.id}
                      className="mb-2 rounded-xl bg-(--color-accent-400)/12 p-2 text-[10px] text-(--color-ink)"
                    >
                      <p className="truncate font-medium">{event.title}</p>
                      <p className="mt-1 text-(--color-ink-muted)">
                        {event.kind === 'holiday'
                          ? 'Holiday'
                          : event.kind === 'note'
                            ? 'Note'
                            : 'Event'}
                      </p>
                    </div>
                  ))}
                  {daySlots.length === 0 && dayEvents.length === 0 && (
                    <p className="p-1 text-[10px] leading-relaxed text-(--color-ink-faint)">
                      Example slots and events appear here after you add a subject
                      schedule or note.
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
        <Card className="rounded-4xl p-5">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-(--color-accent-350)" />
            <p className="text-sm font-semibold">
              {selectedDate.toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          <p className="mt-3 font-(family-name:--font-calligraphy) text-2xl text-(--color-accent-350)">
            Plan a gentle day
          </p>
          <div className="mt-5 space-y-3">
            {selectedSlots.map((slot) => (
              <div
                key={slot.id}
                className="rounded-xl bg-(--color-surface-2) p-3 text-sm"
              >
                <p className="font-medium">
                  {subjects.find((item) => item.id === slot.course_subject_id)?.name ??
                    'Course subject'}
                </p>
                <p className="mt-1 text-xs text-(--color-ink-muted)">
                  {slot.starts_at.slice(0, 5)}–{slot.ends_at.slice(0, 5)} ·{' '}
                  {slot.modality.replaceAll('_', ' ')}
                </p>
                {slot.location_label && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-(--color-ink-faint)">
                    <MapPin className="size-3" />
                    {slot.location_label}
                  </p>
                )}
              </div>
            ))}
            {selectedEvents.map((event) => (
              <div
                key={event.id}
                className="rounded-xl border border-(--color-border) p-3 text-sm"
              >
                <p className="font-medium">{event.title}</p>
                {event.notes && (
                  <p className="mt-1 text-xs text-(--color-ink-muted)">{event.notes}</p>
                )}
              </div>
            ))}
            {selectedSlots.length === 0 && selectedEvents.length === 0 && (
              <p className="text-sm text-(--color-ink-muted)">
                This day is open. Add a private note or create a subject meeting schedule
                from its workspace.
              </p>
            )}
          </div>
        </Card>
      </div>
      <ResponsiveDrawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <ResponsiveDrawerContent>
          <ResponsiveDrawerHeader
            title="Add a day note"
            description={`Private to you · ${selectedDate.toLocaleDateString()}`}
          />
          <ResponsiveDrawerBody>
            <div className="space-y-4">
              <label className="block text-sm font-medium" htmlFor="calendar-note-title">
                Title
                <Input
                  id="calendar-note-title"
                  className="mt-1.5"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Prepare activity sheets"
                />
              </label>
              <label className="block text-sm font-medium" htmlFor="calendar-note-body">
                Notes
                <textarea
                  id="calendar-note-body"
                  className="mt-1.5 min-h-28 w-full rounded-md border border-(--color-border) bg-(--color-surface-1) p-3 text-sm"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="A light reminder for this day…"
                />
              </label>
            </div>
          </ResponsiveDrawerBody>
          <ResponsiveDrawerFooter
            primaryLabel="Save note"
            primaryDisabled={!title.trim()}
            primaryLoading={createEvent.isPending}
            onPrimary={() => void saveDayNote()}
            onSecondary={() => setDrawerOpen(false)}
          />
        </ResponsiveDrawerContent>
      </ResponsiveDrawer>
    </div>
  )
}
