import { createFileRoute } from '@tanstack/react-router'
import { CalendarPage } from '@/features/teacher/calendar/CalendarPage'

export const Route = createFileRoute('/_auth/teacher/calendar')({
  component: CalendarPage,
})
