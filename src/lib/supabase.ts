import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** Login sets this to '1' when "remember me" is checked. */
export const REMEMBER_KEY = 'agilearn-remember'

/**
 * Session storage that honors "remember me": persists to localStorage (survives
 * browser close) when the flag is set, otherwise sessionStorage (cleared on
 * close). The flag itself lives in localStorage so the choice is read back the
 * same way on the next load.
 */
const rememberAwareStorage = {
  store() {
    return localStorage.getItem(REMEMBER_KEY) === '1' ? localStorage : sessionStorage
  },
  getItem(key: string) {
    // Read whichever store actually holds the session.
    return localStorage.getItem(key) ?? sessionStorage.getItem(key)
  },
  setItem(key: string, value: string) {
    this.store().setItem(key, value)
  },
  removeItem(key: string) {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  },
}

if (!url || !anonKey) {
  // Surfaced early in dev so a missing .env is obvious rather than a cryptic
  // runtime error deep inside a query.
  console.warn(
    'Supabase credentials are missing. Copy .env.example to .env and set ' +
      'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
  )
}

/** Typed Supabase client singleton. */
export const supabase = createClient<Database>(url ?? '', anonKey ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: rememberAwareStorage,
  },
})
