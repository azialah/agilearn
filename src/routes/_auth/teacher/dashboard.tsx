import { createFileRoute } from '@tanstack/react-router'
import { DashboardPage } from '@/features/teacher/dashboard/DashboardPage'

export const Route = createFileRoute('/_auth/teacher/dashboard')({
  component: DashboardPage,
})
