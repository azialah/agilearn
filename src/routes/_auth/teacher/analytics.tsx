import { createFileRoute } from '@tanstack/react-router'
import { AnalyticsPage } from '@/features/teacher/analytics/AnalyticsPage'

export const Route = createFileRoute('/_auth/teacher/analytics')({
  component: AnalyticsPage,
})
