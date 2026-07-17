import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { keys } from '@/lib/queries/keys'
import type { AppRole, Profile } from '@/types/domain'

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
      queryClient.setQueryData(keys.session, session)
      if (!session) {
        queryClient.removeQueries({ queryKey: keys.profiles.current })
      }
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
  await supabase.auth.signOut()
}
