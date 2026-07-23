import { createFileRoute } from '@tanstack/react-router'
import { AttendancePage } from '@/features/teacher/attendance/AttendancePage'

interface AttendanceSearch {
  studentId?: string
}

export const Route = createFileRoute(
  '/_auth/teacher/classrooms/$classroomId/attendance/',
)({
  validateSearch: (search: Record<string, unknown>): AttendanceSearch => {
    const studentId = typeof search.studentId === 'string' ? search.studentId : undefined
    return studentId ? { studentId } : {}
  },
  component: AttendanceRoute,
})

function AttendanceRoute() {
  const { classroomId } = Route.useParams()
  const { studentId } = Route.useSearch()
  return <AttendancePage classroomId={classroomId} focusStudentId={studentId} />
}
