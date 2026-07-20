import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/teacher/signup/')({
  beforeLoad: () => {
    throw redirect({ to: '/teacher/signup/step-1/create-your-account' })
  },
})
