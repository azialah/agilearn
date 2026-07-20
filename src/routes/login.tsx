import { createFileRoute, redirect } from '@tanstack/react-router'
import { supabase } from '@/lib/supabase'
import { LoginPage } from '@/features/auth/LoginPage'

interface LoginSearch {
  redirect?: string
}

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>): LoginSearch => {
    // Only accept same-origin relative paths ("/foo"), never "//host" or an
    // absolute URL — otherwise ?redirect= becomes an open-redirect after login.
    const raw = search.redirect
    const redirect = typeof raw === 'string' && /^\/(?!\/)/.test(raw) ? raw : undefined
    return { redirect }
  },
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession()
    if (data.session) {
      throw redirect({ to: '/teacher/dashboard' })
    }
  },
  component: LoginPage,
})
