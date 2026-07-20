import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { keys } from '@/lib/queries/keys'
import type { DomainRequest } from '@/types/domain'

/** Pending school-domain requests (admin only; enforced by RLS). */
export function useDomainRequests() {
  return useQuery({
    queryKey: keys.domainRequests,
    queryFn: async (): Promise<DomainRequest[]> => {
      const { data, error } = await supabase
        .from('domain_requests')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

/** Approve a request: allowlist its domain, then clear the request. */
export function useApproveDomainRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (request: DomainRequest) => {
      const { error: upsertError } = await supabase
        .from('allowed_email_domains')
        .upsert(
          { domain: request.domain },
          { onConflict: 'domain', ignoreDuplicates: true },
        )
      if (upsertError) throw upsertError

      const { error: deleteError } = await supabase
        .from('domain_requests')
        .delete()
        .eq('id', request.id)
      if (deleteError) throw deleteError
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.domainRequests })
      queryClient.invalidateQueries({ queryKey: keys.allowedDomains })
    },
  })
}

/** Dismiss a request without allowlisting it. */
export function useDismissDomainRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('domain_requests').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.domainRequests })
    },
  })
}
