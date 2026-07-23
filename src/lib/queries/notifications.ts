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

export async function reconcileNotificationIncident({
  type,
  classroomId,
  studentId,
  courseSubjectId,
  active,
  payload,
}: ReconcileNotificationInput) {
  const { error } = await supabase.rpc('reconcile_notification_incident', {
    p_type: type,
    p_classroom_id: classroomId,
    p_student_id: studentId,
    p_course_subject_id: courseSubjectId ?? null,
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

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onMutate: async (id) => {
      const key = keys.notifications.unread
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<AppNotification[]>(key)
      queryClient.setQueryData<AppNotification[]>(key, (rows) =>
        (rows ?? []).filter((notification) => notification.id !== id),
      )
      return { previous, key }
    },
    onError: (_error, _id, context) => {
      if (context) queryClient.setQueryData(context.key, context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: keys.notifications.unread })
    },
  })
}

export function useClearUnreadNotifications() {
  const queryClient = useQueryClient()
  return useMutation({
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
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<AppNotification[]>(key)
      queryClient.setQueryData<AppNotification[]>(key, [])
      return { previous, key }
    },
    onError: (_error, _variables, context) => {
      if (context) queryClient.setQueryData(context.key, context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: keys.notifications.unread })
    },
  })
}
