import { createFileRoute } from '@tanstack/react-router'
import { PrivacyPage } from '@/features/public/LegalPages'
import { getSafeSignupReturnTo } from '@/features/public/legalReturn'

interface LegalSearch {
  returnTo?: string
}

export const Route = createFileRoute('/privacy')({
  validateSearch: (search: Record<string, unknown>): LegalSearch => ({
    returnTo: getSafeSignupReturnTo(search.returnTo),
  }),
  head: () => ({
    meta: [
      { title: 'Privacy Notice (Draft) | Agilearn' },
      {
        name: 'description',
        content: 'Agilearn’s draft privacy notice, pending final legal review.',
      },
    ],
  }),
  component: PrivacyRoute,
})

function PrivacyRoute() {
  const { returnTo } = Route.useSearch()
  return <PrivacyPage returnTo={returnTo} />
}
