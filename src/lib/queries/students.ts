import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { keys } from '@/lib/queries/keys'
import type { Student, StudentInsert, StudentUpdate } from '@/types/domain'

export function useStudents(classroomId: string) {
  return useQuery({
    queryKey: keys.students.byClassroom(classroomId),
    enabled: !!classroomId,
    queryFn: async (): Promise<Student[]> => {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('classroom_id', classroomId)
        .order('last_name', { ascending: true })
        .order('first_name', { ascending: true })
      if (error) throw error
      return data ?? []
    },
  })
}

export const STUDENTS_PAGE_SIZE = 15

/**
 * One page of the roster table. Separate from `useStudents` on purpose — grades,
 * attendance and export all need the whole roster, so paging that hook would
 * quietly truncate them.
 */
export function useStudentsPage(classroomId: string, page: number) {
  return useQuery({
    queryKey: keys.students.page(classroomId, page),
    enabled: !!classroomId,
    queryFn: async (): Promise<{ rows: Student[]; total: number }> => {
      const from = page * STUDENTS_PAGE_SIZE
      const { data, error, count } = await supabase
        .from('students')
        .select('*', { count: 'exact' })
        .eq('classroom_id', classroomId)
        .order('last_name', { ascending: true })
        .order('first_name', { ascending: true })
        .range(from, from + STUDENTS_PAGE_SIZE - 1)
      if (error) throw error
      return { rows: data ?? [], total: count ?? 0 }
    },
  })
}

export function useCreateStudent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: StudentInsert) => {
      const { data, error } = await supabase
        .from('students')
        .insert(input)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (row) => {
      queryClient.invalidateQueries({
        queryKey: keys.students.byClassroom(row.classroom_id),
      })
      queryClient.invalidateQueries({ queryKey: keys.classrooms.all })
    },
  })
}

export function useUpdateStudent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: StudentUpdate }) => {
      const { data, error } = await supabase
        .from('students')
        .update(patch)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (row) => {
      queryClient.invalidateQueries({
        queryKey: keys.students.byClassroom(row.classroom_id),
      })
    },
  })
}

export function useDeleteStudent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; classroomId: string }) => {
      const { error } = await supabase.from('students').delete().eq('id', id)
      if (error) throw error
      return id
    },
    onSuccess: (_id, variables) => {
      queryClient.invalidateQueries({
        queryKey: keys.students.byClassroom(variables.classroomId),
      })
      queryClient.invalidateQueries({ queryKey: keys.classrooms.all })
    },
  })
}

/**
 * Fetch every student visible to the signed-in teacher (RLS scopes classrooms).
 * Useful for cross-classroom dashboards where a teacher needs a single flat
 * list of all rostered students.
 */
export function useAllStudents() {
  return useQuery({
    queryKey: keys.studentsAll,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('last_name', { ascending: true })
        .order('first_name', { ascending: true })
      if (error) throw error
      return (data ?? []) as unknown as import('@/types/domain').Student[]
    },
  })
}
