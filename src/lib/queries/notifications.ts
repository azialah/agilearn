import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { keys } from '@/lib/queries/keys'
import type { AppNotification } from '@/types/domain'

export type NotificationType = 'low_average' | 'absence_streak'

export interface NotificationPayload {
  studentName: string
  value: number
  courseSubjectName?: string
}

export interface ReconcileNotificationInput {
  type: NotificationType
  classroomId: string
  studentId: string
  courseSubjectId?: string
  active: boolean
  payload: NotificationPayload
}

interface ReconciliationFlight {
  latest: ReconcileNotificationInput | undefined
  promise: Promise<void>
}

const reconciliationFlights = new Map<string, ReconciliationFlight>()

function reconciliationKey(input: ReconcileNotificationInput): string {
  const subjectId =
    input.type === 'absence_streak' ? 'classroom' : (input.courseSubjectId ?? 'classroom')
  return [input.type, input.classroomId, input.studentId, subjectId].join(':')
}

async function reconcileNotificationIncidentRequest({
  type,
  classroomId,
  studentId,
  courseSubjectId,
  active,
  payload,
}: ReconcileNotificationInput): Promise<void> {
  const { error } = await supabase.rpc('reconcile_notification_incident', {
    p_type: type,
    p_classroom_id: classroomId,
    p_student_id: studentId,
    // p_course_subject_id is genuinely nullable in SQL — 0018_notifications.sql
    // sets it to null itself for absence_streak and guards with `is not null`.
    // Supabase's type generator can't express nullable arguments, so it widens
    // the param to a required string; the cast restores the real contract.
    // It must be sent explicitly (not omitted) since the arg has no DEFAULT.
    p_course_subject_id: (courseSubjectId ?? null) as string,
    p_active: active,
    p_payload: {
      studentName: payload.studentName,
      value: payload.value,
      ...(payload.courseSubjectName
        ? { courseSubjectName: payload.courseSubjectName }
        : {}),
    },
  })
  if (error) throw error
}

/**
 * Coalesce repeated evaluations of one incident into one in-flight RPC plus a
 * trailing reconciliation of the most recent state. This keeps render-driven
 * recalculation from racing stale active/resolved writes against each other.
 */
export function reconcileNotificationIncident(input: ReconcileNotificationInput) {
  const key = reconciliationKey(input)
  const existing = reconciliationFlights.get(key)
  if (existing) {
    existing.latest = input
    return existing.promise
  }

  const flight = {} as ReconciliationFlight
  flight.latest = input
  flight.promise = (async () => {
    while (flight.latest) {
      const request = flight.latest
      flight.latest = undefined
      try {
        await reconcileNotificationIncidentRequest(request)
      } catch (error) {
        // A newer settled state must still win if an older request failed.
        // Otherwise a transient failure can strand the incident in the wrong
        // active/resolved state until another query dependency happens to move.
        if (flight.latest) continue
        throw error
      }
    }
  })().finally(() => {
    if (reconciliationFlights.get(key) === flight) reconciliationFlights.delete(key)
  })
  reconciliationFlights.set(key, flight)
  return flight.promise
}

export function useUnreadNotifications() {
  return useQuery({
    queryKey: keys.notifications.unread,
    queryFn: async (): Promise<AppNotification[]> => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .is('read_at', null)
        .is('resolved_at', null)
        .order('created_at', { ascending: false })
        .limit(10)
      if (error) throw error
      return data ?? []
    },
  })
}

/** Exact unread count; the notification menu intentionally fetches only its latest ten rows. */
export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: keys.notifications.unreadCount,
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .is('read_at', null)
        .is('resolved_at', null)
      if (error) throw error
      return count ?? 0
    },
  })
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    scope: { id: 'notifications:unread' },
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onMutate: async (id) => {
      const key = keys.notifications.unread
      await Promise.all([
        queryClient.cancelQueries({ queryKey: key }),
        queryClient.cancelQueries({ queryKey: keys.notifications.unreadCount }),
      ])
      const countKey = keys.notifications.unreadCount
      queryClient.setQueryData<AppNotification[]>(key, (rows) =>
        (rows ?? []).filter((notification) => notification.id !== id),
      )
      queryClient.setQueryData<number>(countKey, (count) =>
        typeof count === 'number' ? Math.max(0, count - 1) : count,
      )
    },
    onError: () => {
      // Concurrent optimistic mutations can observe different snapshots before
      // their shared mutation scope starts. Refetching is the only safe
      // rollback: restoring an older snapshot could resurrect a notification
      // successfully cleared by a newer action.
      queryClient.invalidateQueries({ queryKey: keys.notifications.unread })
      queryClient.invalidateQueries({ queryKey: keys.notifications.unreadCount })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: keys.notifications.unread })
      queryClient.invalidateQueries({ queryKey: keys.notifications.unreadCount })
    },
  })
}

export function useClearUnreadNotifications() {
  const queryClient = useQueryClient()
  return useMutation({
    scope: { id: 'notifications:unread' },
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .is('read_at', null)
        .is('resolved_at', null)
      if (error) throw error
    },
    onMutate: async () => {
      const key = keys.notifications.unread
      await Promise.all([
        queryClient.cancelQueries({ queryKey: key }),
        queryClient.cancelQueries({ queryKey: keys.notifications.unreadCount }),
      ])
      const countKey = keys.notifications.unreadCount
      queryClient.setQueryData<AppNotification[]>(key, [])
      queryClient.setQueryData<number>(countKey, 0)
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: keys.notifications.unread })
      queryClient.invalidateQueries({ queryKey: keys.notifications.unreadCount })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: keys.notifications.unread })
      queryClient.invalidateQueries({ queryKey: keys.notifications.unreadCount })
    },
  })
}
