import { createFileRoute } from '@tanstack/react-router'
import { RequestAccessPage } from '@/features/public/RequestAccessPage'

interface RequestAccessSearch {
  domain?: string
}

export const Route = createFileRoute('/request-access')({
  validateSearch: (search: Record<string, unknown>): RequestAccessSearch => ({
    domain: typeof search.domain === 'string' ? search.domain.slice(0, 253) : undefined,
  }),
  component: RequestAccessRoute,
})

function RequestAccessRoute() {
  const { domain } = Route.useSearch()
  return <RequestAccessPage domain={domain} />
}
