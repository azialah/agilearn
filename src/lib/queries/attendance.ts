import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { keys } from '@/lib/queries/keys'
import { enqueueWrite } from '@/lib/offlineQueue'
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
export function useClassSessions(classroomId: string, courseSubjectId?: string) {
  return useQuery({
    queryKey: keys.attendance.sessions(classroomId, courseSubjectId),
    enabled: !!classroomId,
    queryFn: async (): Promise<ClassSessionWithRecords[]> => {
      let query = supabase
        .from('class_sessions')
        .select('*, attendance_records(student_id, status)')
        .eq('classroom_id', classroomId)
        .order('session_date', { ascending: false })
        .order('created_at', { ascending: false })
      if (courseSubjectId) query = query.eq('course_subject_id', courseSubjectId)
      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as ClassSessionWithRecords[]
    },
  })
}

/** A single class session by id. */
export function useClassSession(sessionId: string) {
  return useQuery({
    queryKey: keys.attendance.session(sessionId),
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

/** Every session visible to the signed-in teacher via classroom RLS. */
export function useAllClassSessions() {
  return useQuery({
    queryKey: keys.attendance.allSessions,
    queryFn: async (): Promise<ClassSessionWithRecords[]> => {
      const { data, error } = await supabase
        .from('class_sessions')
        .select('*, attendance_records(student_id, status)')
        .order('session_date', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as ClassSessionWithRecords[]
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
        queryKey: keys.attendance.sessionsBase(row.classroom_id),
      })
      queryClient.invalidateQueries({ queryKey: keys.attendance.allSessions })
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
        queryKey: keys.attendance.sessionsBase(row.classroom_id),
      })
      queryClient.invalidateQueries({ queryKey: keys.attendance.allSessions })
      queryClient.invalidateQueries({
        queryKey: keys.attendance.session(row.id),
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
        queryKey: keys.attendance.sessionsBase(variables.classroomId),
      })
      queryClient.invalidateQueries({ queryKey: keys.attendance.allSessions })
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
 * A failed write is not always a lost write. When the network is the reason,
 * the edit is parked in IndexedDB and replayed on reconnect; the optimistic
 * cache entry stays put so the teacher keeps seeing what they marked.
 *
 * Anything else — RLS, a constraint, a bad payload — is a real error and must
 * surface, so it is rethrown.
 */
async function queueIfOffline(
  inputs: AttendanceRecordInsert[],
  existing: AttendanceRecord[] | undefined,
  error: unknown,
): Promise<boolean> {
  const offline = !navigator.onLine || isNetworkError(error)
  if (!offline) return false

  for (const input of inputs) {
    const previous = existing?.find((record) => record.student_id === input.student_id)
    await enqueueWrite({
      id: `attendance:${input.session_id}:${input.student_id}`,
      table: 'attendance_records',
      payload: { ...input },
      onConflict: 'session_id,student_id',
      baseUpdatedAt: previous?.updated_at ?? null,
      queuedAt: Date.now(),
      label: `Attendance for student ${input.student_id}`,
    })
  }
  window.dispatchEvent(new Event('agilearn-queue-changed'))
  return true
}

/** Supabase surfaces a dropped connection as a TypeError from fetch. */
function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) return true
  const message = error instanceof Error ? error.message : String(error)
  return /fetch|network|Failed to fetch/i.test(message)
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
    onError: async (error, input, context) => {
      if (await queueIfOffline([input], context?.previous, error)) return
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.invalidateQueries({
        queryKey: keys.attendance.sessionsBase(classroomId),
      })
      queryClient.invalidateQueries({ queryKey: keys.attendance.allSessions })
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
    onError: async (error, inputs, context) => {
      if (await queueIfOffline(inputs, context?.previous, error)) return
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.invalidateQueries({
        queryKey: keys.attendance.sessionsBase(classroomId),
      })
      queryClient.invalidateQueries({ queryKey: keys.attendance.allSessions })
    },
  })
}
