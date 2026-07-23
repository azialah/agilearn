import { createFileRoute } from '@tanstack/react-router'
import { ProfileSection } from '@/features/settings/sections/ProfileSection'

export const Route = createFileRoute('/_auth/settings/profile')({
  component: ProfileSection,
})
