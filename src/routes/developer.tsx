import { createFileRoute } from '@tanstack/react-router'
import { DeveloperPage } from '@/features/public/DeveloperPage'

export const Route = createFileRoute('/developer')({
  component: DeveloperPage,
})
