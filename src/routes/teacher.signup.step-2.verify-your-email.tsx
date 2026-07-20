import { createFileRoute } from '@tanstack/react-router'
import { SignupWizard } from '@/features/teacher/onboarding/SignupWizard'

export const Route = createFileRoute('/teacher/signup/step-2/verify-your-email')({
  component: () => <SignupWizard step="verify" />,
})
