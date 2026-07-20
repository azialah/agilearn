import { createFileRoute } from '@tanstack/react-router'
import { SignupWizard } from '@/features/teacher/onboarding/SignupWizard'

export const Route = createFileRoute('/teacher/signup/step-1/create-your-account')({
  component: () => <SignupWizard step="credentials" />,
})
