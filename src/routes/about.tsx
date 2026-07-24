import { createFileRoute } from '@tanstack/react-router'
import { AboutPage } from '@/features/public/AboutPage'

export const Route = createFileRoute('/about')({
  head: () => ({
    meta: [
      { title: 'About | Agilearn' },
      {
        name: 'description',
        content:
          'Learn about Agilearn, a calm school-management workspace for teachers and administrators.',
      },
    ],
  }),
  component: AboutPage,
})
