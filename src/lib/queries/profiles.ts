import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { keys } from '@/lib/queries/keys'
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
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      // Sign-out is the one place every caller routes through, so the whole
      // cache is dropped here rather than per call site — otherwise classrooms,
      // grades and attendance survive the sign-out and the next account on this
      // tab sees the previous teacher's rows until each query refetches.
      // clear() runs first: it would otherwise wipe the session we just wrote.
      if (!session) queryClient.clear()
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
  if (error) throw error
}
