import { createFileRoute, redirect } from '@tanstack/react-router'
import { LandingPage } from '@/features/landing/LandingPage'
import { isStandalone } from '@/lib/supabase'
import { readLastRoute } from '@/lib/lastRoute'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    // The marketing landing page only makes sense as a lg+ desktop pitch —
    // an installed PWA on a phone/tablet has no "desktop site" to browse, so
    // send it straight into the app instead. Browser tabs (even on mobile)
    // still see the landing page; only standalone-mode + sub-lg redirects.
    const isBelowLarge = window.matchMedia('(max-width: 1023px)').matches
    if (isStandalone() && isBelowLarge) {
      // Resume where they left off after an OS-discarded relaunch. If the
      // session has since expired, _auth bounces on to /login anyway.
      const last = readLastRoute()
      throw redirect({ to: last ?? '/login' })
    }
  },
  component: LandingPage,
})
