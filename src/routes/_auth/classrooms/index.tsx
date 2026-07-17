import { createFileRoute } from '@tanstack/react-router'
import { ClassroomsPage } from '@/features/classrooms/ClassroomsPage'

export const Route = createFileRoute('/_auth/classrooms/')({
  component: ClassroomsPage,
})
