import { createFileRoute } from '@tanstack/react-router'
import { HowItWorksPage } from '@/features/public/HowItWorksPage'

export const Route = createFileRoute('/how-it-works')({
  component: HowItWorksPage,
})
