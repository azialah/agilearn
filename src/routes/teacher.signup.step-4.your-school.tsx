import { createFileRoute } from '@tanstack/react-router'
import { SignupWizard } from '@/features/teacher/onboarding/SignupWizard'

export const Route = createFileRoute('/teacher/signup/step-4/your-school')({
  component: () => <SignupWizard step="school" />,
})
