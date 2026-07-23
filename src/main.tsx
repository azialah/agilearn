import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { PageLoader } from './components/ui/PageLoader'
import { ErrorBoundary } from './lib/bugsnag'
import './styles/app.css'

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  defaultPendingComponent: PageLoader,
  scrollRestoration: true,
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
