import { createFileRoute } from '@tanstack/react-router'
import { FeaturesPage } from '@/features/public/FeaturesPage'

export const Route = createFileRoute('/features')({
  head: () => ({
    meta: [
      { title: 'Features | Agilearn' },
      {
        name: 'description',
        content:
          'Explore Agilearn’s classroom, grades, attendance, and teaching-material tools.',
      },
    ],
  }),
  component: FeaturesPage,
})
