import { createFileRoute } from '@tanstack/react-router'
import { ProfilePage } from '@/features/teacher/profile/ProfilePage'

export const Route = createFileRoute('/_auth/teacher/profile')({ component: ProfilePage })
