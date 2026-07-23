import { createFileRoute, redirect } from '@tanstack/react-router'
import { supabase } from '@/lib/supabase'
import { ForgotPasswordFlow } from '@/features/auth/ForgotPasswordFlow'

export const Route = createFileRoute('/forgot-password')({
  beforeLoad: async () => {
    // A clicked recovery-email link lands here already "signed in" (Supabase
    // establishes a session from the URL's #access_token before this runs) —
    // don't bounce that case to the dashboard, let the flow show the
    // set-new-password screen instead.
    if (window.location.hash.includes('type=recovery')) return
    const { data } = await supabase.auth.getSession()
    if (data.session) {
      throw redirect({ to: '/teacher/dashboard' })
    }
  },
  component: ForgotPasswordFlow,
})
