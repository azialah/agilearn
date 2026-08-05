import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { keys } from '@/lib/queries/keys'
import { supabase } from '@/lib/supabase'
import type {
  CalendarEvent,
  CalendarEventInsert,
  CalendarEventUpdate,
  SubjectMeetingSlot,
  SubjectMeetingSlotInsert,
  SubjectMeetingSlotUpdate,
} from '@/types/domain'

export function useMeetingSlots(subjectId?: string) {
  return useQuery({
    queryKey: subjectId ? keys.calendar.slots(subjectId) : keys.calendar.allSlots,
    queryFn: async (): Promise<SubjectMeetingSlot[]> => {
      let query = supabase
        .from('subject_meeting_slots')
        .select('*')
        .order('weekday')
        .order('starts_at')
      if (subjectId) query = query.eq('course_subject_id', subjectId)
      const { data, error } = await query
      if (error) throw error
      return data ?? []
    },
  })
}

export function useCalendarEvents(from: string, to: string) {
  return useQuery({
    queryKey: keys.calendar.events(from, to),
    queryFn: async (): Promise<CalendarEvent[]> => {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .gte('starts_at', from)
        .lt('starts_at', to)
        .order('starts_at')
      if (error) throw error
      return data ?? []
    },
  })
}

export function useCreateMeetingSlot() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: SubjectMeetingSlotInsert) => {
      const { data, error } = await supabase
        .from('subject_meeting_slots')
        .insert(input)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (slot) => {
      queryClient.invalidateQueries({ queryKey: keys.calendar.allSlots })
      queryClient.invalidateQueries({
        queryKey: keys.calendar.slots(slot.course_subject_id),
      })
    },
  })
}

export function useUpdateMeetingSlot() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string
      patch: SubjectMeetingSlotUpdate
    }) => {
      const { data, error } = await supabase
        .from('subject_meeting_slots')
        .update(patch)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (slot) => {
      queryClient.invalidateQueries({ queryKey: keys.calendar.allSlots })
      queryClient.invalidateQueries({
        queryKey: keys.calendar.slots(slot.course_subject_id),
      })
    },
  })
}

export function useDeleteMeetingSlot() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (slot: SubjectMeetingSlot) => {
      const { error } = await supabase
        .from('subject_meeting_slots')
        .delete()
        .eq('id', slot.id)
      if (error) throw error
      return slot
    },
    onSuccess: (slot) => {
      queryClient.invalidateQueries({ queryKey: keys.calendar.allSlots })
      queryClient.invalidateQueries({
        queryKey: keys.calendar.slots(slot.course_subject_id),
      })
    },
  })
}

export function useCreateCalendarEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CalendarEventInsert) => {
      const { data, error } = await supabase
        .from('calendar_events')
        .insert(input)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: keys.calendar.eventsBase }),
  })
}

export function useUpdateCalendarEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: CalendarEventUpdate }) => {
      const { data, error } = await supabase
        .from('calendar_events')
        .update(patch)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: keys.calendar.eventsBase }),
  })
}

export function useDeleteCalendarEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('calendar_events').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: keys.calendar.eventsBase }),
  })
}

export interface StorageUsage {
  used_bytes: number
  quota_bytes: number
}

export function useStorageUsage() {
  return useQuery({
    queryKey: keys.usage,
    queryFn: async (): Promise<StorageUsage> => {
      const { data, error } = await supabase.rpc('module_storage_usage')
      if (error) throw error
      return data?.[0] ?? { used_bytes: 0, quota_bytes: 524288000 }
    },
  })
}
