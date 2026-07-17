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
