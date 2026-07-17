import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { keys } from '@/lib/queries/keys'
import type {
  AttendanceRecord,
  AttendanceRecordInsert,
  ClassSession,
  ClassSessionInsert,
  ClassSessionUpdate,
} from '@/types/domain'

/** A class session joined with the lightweight status of each of its records. */
export type ClassSessionWithRecords = ClassSession & {
  attendance_records: Pick<AttendanceRecord, 'student_id' | 'status'>[]
}

/** All sessions for a classroom, newest first, each carrying its record statuses. */
export function useClassSessions(classroomId: string) {
  return useQuery({
    queryKey: keys.attendance.sessions(classroomId),
    enabled: !!classroomId,
    queryFn: async (): Promise<ClassSessionWithRecords[]> => {
      const { data, error } = await supabase
        .from('class_sessions')
        .select('*, attendance_records(student_id, status)')
        .eq('classroom_id', classroomId)
        .order('session_date', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as ClassSessionWithRecords[]
    },
  })
}

/** A single class session by id. */
export function useClassSession(sessionId: string) {
  return useQuery({
    queryKey: ['attendance', 'session', sessionId] as const,
    enabled: !!sessionId,
    queryFn: async (): Promise<ClassSession | null> => {
      const { data, error } = await supabase
        .from('class_sessions')
        .select('*')
        .eq('id', sessionId)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

/** Attendance records that already exist for a session (unrecorded students absent from this list). */
export function useSessionRecords(sessionId: string) {
  return useQuery({
    queryKey: keys.attendance.records(sessionId),
    enabled: !!sessionId,
    queryFn: async (): Promise<AttendanceRecord[]> => {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('session_id', sessionId)
      if (error) throw error
      return data ?? []
    },
  })
}

export function useCreateSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: ClassSessionInsert) => {
      const { data, error } = await supabase
        .from('class_sessions')
        .insert(input)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (row) => {
      queryClient.invalidateQueries({
        queryKey: keys.attendance.sessions(row.classroom_id),
      })
    },
  })
}

export function useUpdateSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: ClassSessionUpdate }) => {
      const { data, error } = await supabase
        .from('class_sessions')
        .update(patch)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (row) => {
      queryClient.invalidateQueries({
        queryKey: keys.attendance.sessions(row.classroom_id),
      })
      queryClient.invalidateQueries({
        queryKey: ['attendance', 'session', row.id],
      })
    },
  })
}

export function useDeleteSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; classroomId: string }) => {
      const { error } = await supabase.from('class_sessions').delete().eq('id', id)
      if (error) throw error
      return id
    },
    onSuccess: (_id, variables) => {
      queryClient.invalidateQueries({
        queryKey: keys.attendance.sessions(variables.classroomId),
      })
    },
  })
}

function optimisticRecord(input: AttendanceRecordInsert): AttendanceRecord {
  return {
    session_id: input.session_id,
    student_id: input.student_id,
    status: input.status ?? 'present',
    remarks: input.remarks ?? '',
    updated_at: new Date().toISOString(),
  }
}

function mergeRecords(
  existing: AttendanceRecord[] | undefined,
  incoming: AttendanceRecord[],
): AttendanceRecord[] {
  const byStudent = new Map((existing ?? []).map((record) => [record.student_id, record]))
  for (const record of incoming) byStudent.set(record.student_id, record)
  return Array.from(byStudent.values())
}

/**
 * Upsert one attendance record (status + remarks) with an optimistic cache
 * write and rollback on error. Also refreshes the classroom session list so
 * present/absent counts stay in sync.
 */
export function useUpsertAttendance(sessionId: string, classroomId: string) {
  const queryClient = useQueryClient()
  const key = keys.attendance.records(sessionId)
  return useMutation({
    mutationFn: async (input: AttendanceRecordInsert) => {
      const { data, error } = await supabase
        .from('attendance_records')
        .upsert(input, { onConflict: 'session_id,student_id' })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<AttendanceRecord[]>(key)
      queryClient.setQueryData<AttendanceRecord[]>(key, (old) =>
        mergeRecords(old, [optimisticRecord(input)]),
      )
      return { previous }
    },
    onError: (_error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.invalidateQueries({
        queryKey: keys.attendance.sessions(classroomId),
      })
    },
  })
}

/** Upsert many records at once (e.g. "mark all present"), optimistic with rollback. */
export function useBulkUpsertAttendance(sessionId: string, classroomId: string) {
  const queryClient = useQueryClient()
  const key = keys.attendance.records(sessionId)
  return useMutation({
    mutationFn: async (inputs: AttendanceRecordInsert[]) => {
      if (inputs.length === 0) return []
      const { data, error } = await supabase
        .from('attendance_records')
        .upsert(inputs, { onConflict: 'session_id,student_id' })
        .select()
      if (error) throw error
      return data ?? []
    },
    onMutate: async (inputs) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<AttendanceRecord[]>(key)
      queryClient.setQueryData<AttendanceRecord[]>(key, (old) =>
        mergeRecords(old, inputs.map(optimisticRecord)),
      )
      return { previous }
    },
    onError: (_error, _inputs, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.invalidateQueries({
        queryKey: keys.attendance.sessions(classroomId),
      })
    },
  })
}
