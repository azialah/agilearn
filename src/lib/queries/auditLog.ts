import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { keys } from '@/lib/queries/keys'
import type { AuditLog } from '@/types/domain'

export interface AuditLogRow extends AuditLog {
  actor: { full_name: string; email: string } | null
}

export interface AuditLogFilters {
  limit: number
  /** Filter to a single actor's events (profiles.id). Omit/empty for all actors. */
  actorId?: string
  /** Inclusive lower bound, 'YYYY-MM-DD' from a date input. */
  from?: string
  /** Inclusive upper bound (whole day), 'YYYY-MM-DD' from a date input. */
  to?: string
}

/** Most recent admin-relevant audit events, newest first (admin-only view; RLS-enforced). */
export function useAuditLog(filters: AuditLogFilters) {
  const { limit, actorId, from, to } = filters
  return useQuery({
    queryKey: keys.auditLog.list(filters),
    queryFn: async (): Promise<AuditLogRow[]> => {
      let query = supabase
        .from('audit_log')
        .select('*, actor:profiles!audit_log_actor_id_fkey(full_name, email)')
        .order('created_at', { ascending: false })

      if (actorId) query = query.eq('actor_id', actorId)
      if (from) query = query.gte('created_at', from)
      if (to) query = query.lte('created_at', `${to}T23:59:59.999`)

      const { data, error } = await query.limit(limit)
      if (error) throw error
      return (data ?? []) as AuditLogRow[]
    },
  })
}
