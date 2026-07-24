import { createFileRoute, redirect } from '@tanstack/react-router'
import { LandingPage } from '@/features/landing/LandingPage'

type NavigatorWithStandalone = Navigator & { standalone?: boolean }

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    // The marketing landing page only makes sense as a lg+ desktop pitch —
    // an installed PWA on a phone/tablet has no "desktop site" to browse, so
    // send it straight to sign-in instead. Browser tabs (even on mobile)
    // still see the landing page; only standalone-mode + sub-lg redirects.
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as NavigatorWithStandalone).standalone === true
    const isBelowLarge = window.matchMedia('(max-width: 1023px)').matches
    if (isStandalone && isBelowLarge) {
      throw redirect({ to: '/login' })
    }
  },
  component: LandingPage,
})
