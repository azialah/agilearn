import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { PageLoader } from './components/ui/PageLoader'
import { ErrorBoundary } from './lib/bugsnag'
import { saveLastRoute } from './lib/lastRoute'
import './styles/app.css'

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  defaultPendingComponent: PageLoader,
  scrollRestoration: true,
})

// The OS discards a backgrounded standalone PWA and relaunches it at start_url,
// losing the user's place. Remember where they were; `/` restores it. saveLastRoute
// ignores anything that isn't an in-app surface.
router.subscribe('onResolved', ({ toLocation }) => {
  saveLastRoute(toLocation.pathname)
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

const rootElement = document.getElementById('root')!
createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  </StrictMode>,
)
