/**
 * Foreground OS notification via the Notification API — not the Push API, so
 * no service-worker push subscription or backend/VAPID keys are needed; this
 * only fires while the app's own JS is running (an open tab, or an installed
 * PWA the OS still has resident). Tries the active service worker's
 * showNotification() first (the more reliable path for installed PWAs,
 * especially Android), falling back to the plain constructor for a regular
 * browser tab. Silently no-ops wherever unsupported — most notably iOS
 * Safari, which only allows notifications through a real Push subscription,
 * which this client-only app doesn't have.
 */
export function maybeNotifyNative(title: string, body?: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return

  async function show() {
    const options: NotificationOptions = {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
    }
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready
        await registration.showNotification(title, options)
        return
      } catch {
        // Fall through to the plain constructor below.
      }
    }
    try {
      new Notification(title, options)
    } catch {
      // Unsupported in this context — the in-app toast still shown either way.
    }
  }

  if (Notification.permission === 'granted') {
    void show()
  } else if (Notification.permission === 'default') {
    void Notification.requestPermission().then((permission) => {
      if (permission === 'granted') void show()
    })
  }
}
