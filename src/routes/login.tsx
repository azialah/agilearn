import { createFileRoute, redirect } from '@tanstack/react-router'
import { supabase } from '@/lib/supabase'
import { safeRedirectPath } from '@/lib/safeRedirect'
import { LoginPage } from '@/features/auth/LoginPage'

interface LoginSearch {
  redirect?: string
}

export const Route = createFileRoute('/login')({
  // Resolving the candidate against the real origin and comparing is the only
  // guard that holds. The previous regex only rejected a second forward slash,
  // so "/\host", "/<TAB>/host" and "/<LF>/host" all passed and the URL parser
  // resolved every one of them off-origin. See src/lib/safeRedirect.ts.
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: safeRedirectPath(search.redirect),
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession()
    if (data.session) {
      throw redirect({ to: '/teacher/dashboard' })
    }
  },
  component: LoginPage,
})
