import { createFileRoute } from '@tanstack/react-router'
import { AttendancePage } from '@/features/teacher/attendance/AttendancePage'

interface AttendanceSearch {
  studentId?: string
  subjectId?: string
}

export const Route = createFileRoute(
  '/_auth/teacher/classrooms/$classroomId/attendance/',
)({
  validateSearch: (search: Record<string, unknown>): AttendanceSearch => {
    const studentId = typeof search.studentId === 'string' ? search.studentId : undefined
    const subjectId = typeof search.subjectId === 'string' ? search.subjectId : undefined
    return { ...(studentId ? { studentId } : {}), ...(subjectId ? { subjectId } : {}) }
  },
  component: AttendanceRoute,
})

function AttendanceRoute() {
  const { classroomId } = Route.useParams()
  const { studentId, subjectId } = Route.useSearch()
  const navigate = Route.useNavigate()
  return (
    <AttendancePage
      classroomId={classroomId}
      focusStudentId={studentId}
      initialSubjectId={subjectId}
      onSubjectChange={(id) =>
        navigate({ search: (prev) => ({ ...prev, subjectId: id }) })
      }
    />
  )
}
