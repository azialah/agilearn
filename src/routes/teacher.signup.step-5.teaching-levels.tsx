import { createFileRoute } from '@tanstack/react-router'
import { SignupWizard } from '@/features/teacher/onboarding/SignupWizard'

export const Route = createFileRoute('/teacher/signup/step-5/teaching-levels')({
  component: () => <SignupWizard step="level" />,
})
