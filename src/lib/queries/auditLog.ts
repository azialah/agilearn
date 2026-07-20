import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { keys } from '@/lib/queries/keys'
import type { AuditLog } from '@/types/domain'

export interface AuditLogRow extends AuditLog {
  actor: { full_name: string; email: string } | null
}

/** Most recent admin-relevant audit events, newest first (admin-only view; RLS-enforced). */
export function useAuditLog(limit: number) {
  return useQuery({
    queryKey: keys.auditLog.all(limit),
    queryFn: async (): Promise<AuditLogRow[]> => {
      const { data, error } = await supabase
        .from('audit_log')
        .select('*, actor:profiles!audit_log_actor_id_fkey(full_name, email)')
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return (data ?? []) as AuditLogRow[]
    },
  })
}
