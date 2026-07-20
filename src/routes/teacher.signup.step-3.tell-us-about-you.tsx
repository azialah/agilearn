import { createFileRoute } from '@tanstack/react-router'
import { SignupWizard } from '@/features/teacher/onboarding/SignupWizard'

export const Route = createFileRoute('/teacher/signup/step-3/tell-us-about-you')({
  component: () => <SignupWizard step="name" />,
})
