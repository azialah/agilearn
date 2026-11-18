import { createFileRoute } from '@tanstack/react-router'
import { FaqPage } from '@/features/public/FaqPage'

export const Route = createFileRoute('/faq')({
  component: FaqPage,
})
