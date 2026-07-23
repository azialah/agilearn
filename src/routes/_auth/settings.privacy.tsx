import { createFileRoute } from '@tanstack/react-router'
import { PrivacySection } from '@/features/settings/sections/PrivacySection'

export const Route = createFileRoute('/_auth/settings/privacy')({
  component: PrivacySection,
})
