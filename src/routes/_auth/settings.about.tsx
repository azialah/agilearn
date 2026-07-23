import { createFileRoute } from '@tanstack/react-router'
import { AboutSection } from '@/features/settings/sections/AboutSection'

export const Route = createFileRoute('/_auth/settings/about')({
  component: AboutSection,
})
