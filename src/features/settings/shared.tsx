import { useEffect, useState } from 'react'
import type { AvatarColor } from '@/components/ui/Avatar'

export const avatarColors: { value: AvatarColor; label: string }[] = [
  { value: 'orange', label: 'Amber' },
  { value: 'plum', label: 'Plum' },
  { value: 'teal', label: 'Teal' },
  { value: 'blue', label: 'Blue' },
]

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Please try again.'
}

/** Reads/requests the browser's Notification permission (used for native OS toasts). */
export function useNotificationPermission() {
  const supported = typeof window !== 'undefined' && 'Notification' in window
  const [permission, setPermission] = useState<NotificationPermission>(
    supported ? Notification.permission : 'denied',
  )

  useEffect(() => {
    if (supported) setPermission(Notification.permission)
  }, [supported])

  async function request() {
    if (!supported) return
    setPermission(await Notification.requestPermission())
  }

  return { supported, permission, request }
}

export function SettingHint({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-md bg-(--color-surface-2) p-3">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs leading-5 text-(--color-ink-muted)">{detail}</p>
    </div>
  )
}
