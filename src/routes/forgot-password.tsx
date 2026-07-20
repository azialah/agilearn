import { createFileRoute, redirect } from '@tanstack/react-router'
import { supabase } from '@/lib/supabase'
import { ForgotPasswordFlow } from '@/features/auth/ForgotPasswordFlow'

export const Route = createFileRoute('/forgot-password')({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession()
    if (data.session) {
      throw redirect({ to: '/teacher/dashboard' })
    }
  },
  component: ForgotPasswordFlow,
})
