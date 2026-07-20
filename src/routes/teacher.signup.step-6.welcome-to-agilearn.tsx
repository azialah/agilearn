import { createFileRoute } from '@tanstack/react-router'
import { SignupWizard } from '@/features/teacher/onboarding/SignupWizard'

export const Route = createFileRoute('/teacher/signup/step-6/welcome-to-agilearn')({
  component: () => <SignupWizard step="welcome" />,
})
