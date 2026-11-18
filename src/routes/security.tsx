import { createFileRoute } from '@tanstack/react-router'
import { SecurityPage } from '@/features/public/SecurityPage'

export const Route = createFileRoute('/security')({
  component: SecurityPage,
})
