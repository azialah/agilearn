import { createFileRoute } from '@tanstack/react-router'
import { UsagePage } from '@/features/teacher/usage/UsagePage'

export const Route = createFileRoute('/_auth/teacher/usage')({ component: UsagePage })
