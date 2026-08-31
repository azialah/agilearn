/**
 * Validation for the `?redirect=` value on /login.
 *
 * This value is attacker-supplied and lands in `window.location.assign()` the
 * instant a sign-in succeeds — the moment a teacher is most primed to re-enter
 * credentials on a lookalike page. Pattern-matching the string is not enough:
 * the previous guard, `/^\/(?!\/)/`, only rejected a second forward slash, so
 * `/\evil.com`, `/<TAB>/evil.com` and `/<LF>/evil.com` all passed and the URL
 * parser resolved every one of them to a different origin.
 *
 * Resolve the candidate exactly the way the browser will, then compare origins.
 * That is the only check that cannot be out-clevered by a separator the spec
 * treats as equivalent to `//`.
 */

function currentOrigin(): string {
  try {
    return window.location.origin
  } catch {
    // Non-browser context (a pure unit test importing this transitively).
    return 'http://localhost'
  }
}

/**
 * The safe same-origin path to send the user to, or `undefined` when the value
 * is missing, unparseable, or points anywhere off-origin.
 *
 * Always returns a relative path — never an absolute URL — so the caller's sink
 * cannot navigate cross-origin even if this function is ever wrong.
 */
export function safeRedirectPath(
  raw: unknown,
  origin: string = currentOrigin(),
): string | undefined {
  if (typeof raw !== 'string' || raw.trim() === '') return undefined

  let target: URL
  let base: URL
  try {
    base = new URL(origin)
    target = new URL(raw, base)
  } catch {
    return undefined
  }

  if (target.origin !== base.origin) return undefined

  // Rebuild from parsed parts rather than echoing the input: whatever exotic
  // separator was used, what leaves here is a plain path.
  //
  // The fragment is dropped deliberately. The sink is a full document load and
  // the Supabase client runs with detectSessionInUrl, so a same-origin
  // "/teacher/dashboard#access_token=<attacker>&refresh_token=<attacker>"
  // would pass the origin check, then be parsed on arrival and overwrite the
  // session the victim just created with their own credentials. Nothing in this
  // app round-trips a hash through login, so there is nothing to preserve.
  const path = `${target.pathname}${target.search}`
  return path.startsWith('/') ? path : undefined
}
