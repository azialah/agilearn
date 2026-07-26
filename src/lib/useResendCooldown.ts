import { useEffect, useState } from 'react'

/** Supabase's built-in SMTP is rate-limited, so throttle resends hard. */
export const RESEND_COOLDOWN_MS = 180_000

const key = (scope: string, email: string) =>
  `agilearn:${scope}-resend-at:${email.trim().toLowerCase()}`

function readAvailableAt(scope: string, email: string): number {
  try {
    const raw = email.trim() && localStorage.getItem(key(scope, email))
    return raw ? Number(raw) : 0
  } catch {
    return 0
  }
}

/**
 * Shared resend throttle for the emailed-link flows (signup confirmation and
 * password recovery). The deadline lives in localStorage rather than component
 * state so it survives a refresh, a closed PWA tab, or an OS relaunch.
 *
 * `scope` keeps the two flows independent; `email` keys it per recipient so
 * switching addresses doesn't inherit someone else's cooldown.
 */
export function useResendCooldown(scope: string, email: string) {
  const [availableAt, setAvailableAt] = useState(() => readAvailableAt(scope, email))
  const [now, setNow] = useState(() => Date.now())
  const remaining = Math.max(0, Math.ceil((availableAt - now) / 1000))

  // Re-read whenever the address changes (including the first render for it).
  useEffect(() => {
    setAvailableAt(readAvailableAt(scope, email))
    setNow(Date.now())
  }, [scope, email])

  useEffect(() => {
    if (remaining <= 0) return
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [remaining])

  function markSent() {
    const next = Date.now() + RESEND_COOLDOWN_MS
    try {
      localStorage.setItem(key(scope, email), String(next))
    } catch {
      // Cooldown is best-effort; the server still rate-limits.
    }
    setAvailableAt(next)
    setNow(Date.now())
  }

  return { remaining, markSent }
}
