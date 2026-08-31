import { useCallback, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useRouter } from '@tanstack/react-router'
import type { Session } from '@supabase/supabase-js'
import { REMEMBER_KEY, supabase } from '@/lib/supabase'
import { keys } from '@/lib/queries/keys'
import { clearLastRoute } from '@/lib/lastRoute'
import { clearCacheSnapshot, clearQueue } from '@/lib/offlineQueue'
import {
  composeFullName,
  type AppRole,
  type Profile,
  type ProfileUpdate,
  type TeachingLevel,
} from '@/types/domain'

/** Current auth session, kept in sync with Supabase auth state changes. */
export function useSession() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: keys.session,
    queryFn: async (): Promise<Session | null> => {
      const { data, error } = await supabase.auth.getSession()
      if (error) throw error
      return data.session
    },
    staleTime: Infinity,
  })

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      // Sign-out is the one place every caller routes through, so the whole
      // cache is dropped here rather than per call site — otherwise classrooms,
      // grades and attendance survive the sign-out and the next account on this
      // tab sees the previous teacher's rows until each query refetches.
      // clear() runs first: it would otherwise wipe the session we just wrote.
      if (!session) {
        queryClient.clear()
        // The offline queue outlives the cache, so it must be dropped too. It
        // holds one teacher's unsent attendance keyed by student; replaying it
        // under the next account on this device would fail RLS anyway, but the
        // pending list would still expose the previous teacher's rows.
        // Only on a real sign-out. A cold start with no restorable session
        // also arrives here as INITIAL_SESSION/null, and dropping the queue
        // then would discard attendance the teacher marked offline before they
        // ever got the chance to reconnect and flush it.
        if (event === 'SIGNED_OUT') void clearQueue()
        // The cache snapshot is a copy of one teacher's classrooms, rosters and
        // grades; it is safe to drop on any session loss.
        void clearCacheSnapshot()
      }
      queryClient.setQueryData(keys.session, session)
    })
    return () => data.subscription.unsubscribe()
  }, [queryClient])

  return query
}

/** The profiles row for the currently authenticated user. */
export function useProfile() {
  const { data: session } = useSession()
  const userId = session?.user.id

  return useQuery({
    queryKey: keys.profiles.current,
    enabled: !!userId,
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId!)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

/** All profiles (admin view). */
export function useProfiles() {
  return useQuery({
    queryKey: keys.profiles.all,
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true })
      if (error) throw error
      return data ?? []
    },
  })
}

/** Allowlisted sign-up email domains (readable by anon for the signup pre-check). */
export function useAllowedDomains() {
  return useQuery({
    queryKey: keys.allowedDomains,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('allowed_email_domains')
        .select('domain')
      if (error) throw error
      return (data ?? []).map((d) => d.domain)
    },
  })
}

interface CompleteProfileInput {
  firstName: string
  lastName: string
  middleName?: string
  suffix?: string
}

/** Fill in the current user's name during onboarding (own row; RLS-allowed). */
export function useCompleteProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CompleteProfileInput) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in.')

      const full_name = composeFullName(input)
      const { data, error } = await supabase
        .from('profiles')
        .update({
          first_name: input.firstName.trim(),
          last_name: input.lastName.trim(),
          middle_name: input.middleName?.trim() || null,
          suffix: input.suffix?.trim() || null,
          full_name,
        })
        .eq('id', user.id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.profiles.current })
    },
  })
}

interface ProfilingDetailsInput {
  school?: string
  location?: string
  teachingLevels?: TeachingLevel[]
}

interface ProfilePreferencesInput {
  preferredLocale?: 'en' | 'tl'
  avatarColor?: 'orange' | 'plum' | 'teal' | 'blue'
}

/** Persist lightweight workspace preferences on the caller's own profile row. */
export function useUpdateProfilePreferences() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: ProfilePreferencesInput) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in.')

      const patch: ProfileUpdate = {}
      if (input.preferredLocale !== undefined)
        patch.preferred_locale = input.preferredLocale
      if (input.avatarColor !== undefined) patch.avatar_color = input.avatarColor

      const { data, error } = await supabase
        .from('profiles')
        .update(patch)
        .eq('id', user.id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.profiles.current })
    },
  })
}

/** Upload a cropped avatar to the public bucket and point the profile at it. */
export function useUploadAvatar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (file: Blob) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in.')

      // Fixed path per user, so an old photo is replaced rather than orphaned.
      const path = `${user.id}/avatar.jpg`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: 'image/jpeg' })
      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(path)
      // The path never changes, so bust the CDN/browser cache on every save.
      const avatar_url = `${publicUrl}?v=${Date.now()}`

      const { data, error } = await supabase
        .from('profiles')
        .update({ avatar_url })
        .eq('id', user.id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.profiles.current })
    },
  })
}

/** Drop the uploaded photo and fall back to the initials avatar. */
export function useRemoveAvatar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in.')

      await supabase.storage.from('avatars').remove([`${user.id}/avatar.jpg`])
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.profiles.current })
    },
  })
}

/**
 * Save optional onboarding profiling on the caller's own row (RLS-allowed).
 * Only the provided keys are patched, so the school step and the level step
 * don't clobber each other.
 */
export function useSaveProfilingDetails() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: ProfilingDetailsInput) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in.')

      const patch: ProfileUpdate = {}
      if (input.school !== undefined) patch.school = input.school.trim() || null
      if (input.location !== undefined) patch.location = input.location.trim() || null
      if (input.teachingLevels !== undefined) {
        patch.teaching_levels = input.teachingLevels.length ? input.teachingLevels : null
      }

      const { data, error } = await supabase
        .from('profiles')
        .update(patch)
        .eq('id', user.id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.profiles.current })
    },
  })
}

/** Change a user's role (admin only; enforced by RLS + the profiles trigger). */
export function useUpdateProfileRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: AppRole }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.profiles.all })
    },
  })
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (!error) return
  // supabase-js returns a network error BEFORE clearing local storage, so a
  // teacher on a dropped connection would be told sign-out failed and be left
  // signed in with everything still cached on the device. Falling back to a
  // local sign-out is the safer failure: worst case the refresh token stays
  // valid server-side until it expires, which beats an unlocked session on a
  // shared laptop.
  const { error: localError } = await supabase.auth.signOut({ scope: 'local' })
  if (localError) throw localError
}

/**
 * Sign out and land on /login.
 *
 * Navigating alone is not enough. `defaultPreload: 'intent'` means hovering the
 * sign-out control preloads /login, whose `beforeLoad` runs while the user is
 * still authenticated, resolves `redirect({ to: '/teacher/dashboard' })`, and
 * caches that match — so the post-sign-out navigate resolves against the cached
 * result and bounces straight back to the dashboard. `router.invalidate()`
 * drops the resolved matches so the guard re-runs against the empty session.
 *
 * Both call sites route through this hook rather than repeating the sequence,
 * so the ordering cannot drift between them.
 */
export function useSignOut() {
  const router = useRouter()
  const navigate = useNavigate()

  return useCallback(async () => {
    try {
      await signOut()
    } finally {
      // Device-local leftovers, cleared even if the sign-out call itself threw.
      // Neither is secret, but on a shared laptop they leak the previous
      // teacher's last classroom path and silently inherit their "remember me"
      // choice at the next sign-in.
      clearLastRoute()
      try {
        localStorage.removeItem(REMEMBER_KEY)
      } catch {
        // Private mode — nothing was persisted to begin with.
      }
    }
    await router.invalidate()
    await navigate({ to: '/login' })
  }, [router, navigate])
}
