import { useEffect, useRef } from 'react'
import { useToast } from '@/components/ui/toast'
import { useNetworkStatus } from '@/lib/useNetworkStatus'

/** Toasts on connectivity transitions: lost, slow, and restored. Fires only
 * on state CHANGE, never on initial mount. */
export function NetworkStatusWatcher() {
  const status = useNetworkStatus()
  const { toast } = useToast()
  const previous = useRef(status)

  useEffect(() => {
    if (status === previous.current) return
    const wasOffline = previous.current === 'offline'
    previous.current = status

    if (status === 'offline') {
      // Attendance now queues on the device and replays on reconnect, so the
      // old "changes may not save" warning was both alarming and wrong.
      toast({
        title: "You're offline",
        description: 'Attendance you mark is saved here and syncs when you reconnect.',
        tone: 'default',
      })
    } else if (status === 'slow') {
      toast({
        title: 'Slow connection',
        description: 'This may take longer than usual.',
        tone: 'default',
      })
    } else if (wasOffline) {
      toast({
        title: 'Back online',
        description: 'Syncing anything you saved offline.',
        tone: 'success',
      })
    }
  }, [status, toast])

  return null
}
