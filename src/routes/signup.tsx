import { createFileRoute } from '@tanstack/react-router'
import { SignupWizard } from '@/features/auth/SignupWizard'

// No beforeLoad session redirect: OTP verification authenticates the user
// mid-wizard, and the wizard itself resumes/redirects based on profile state.
export const Route = createFileRoute('/signup')({
  component: SignupWizard,
})
