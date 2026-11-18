import { createFileRoute } from '@tanstack/react-router'
import { GradeWeightsPage } from '@/features/public/GradeWeightsPage'

export const Route = createFileRoute('/grade-weights')({
  component: GradeWeightsPage,
})
