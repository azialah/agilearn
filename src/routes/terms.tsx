import { createFileRoute } from '@tanstack/react-router'
import { TermsPage } from '@/features/public/LegalPages'
import { getSafeSignupReturnTo } from '@/features/public/legalReturn'

interface LegalSearch {
  returnTo?: string
}

export const Route = createFileRoute('/terms')({
  validateSearch: (search: Record<string, unknown>): LegalSearch => ({
    returnTo: getSafeSignupReturnTo(search.returnTo),
  }),
  head: () => ({
    meta: [
      { title: 'Terms of Use (Draft) | Agilearn' },
      {
        name: 'description',
        content: 'Agilearn’s draft terms of use, pending final legal review.',
      },
    ],
  }),
  component: TermsRoute,
})

function TermsRoute() {
  const { returnTo } = Route.useSearch()
  return <TermsPage returnTo={returnTo} />
}
