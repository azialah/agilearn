import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { keys } from '@/lib/queries/keys'
import type {
  Classroom,
  ClassroomInsert,
  ClassroomUpdate,
  ClassroomWithCount,
} from '@/types/domain'

/** All classrooms visible to the current user, with student counts. */
export function useClassrooms() {
  return useQuery({
    queryKey: keys.classrooms.all,
    queryFn: async (): Promise<ClassroomWithCount[]> => {
      const { data, error } = await supabase
        .from('classrooms')
        .select('*, students(count)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []).map((row) => {
        const { students, ...classroom } = row as Classroom & {
          students: { count: number }[]
        }
        return {
          ...classroom,
          student_count: students?.[0]?.count ?? 0,
        }
      })
    },
  })
}

export function useClassroom(id: string) {
  return useQuery({
    queryKey: keys.classrooms.detail(id),
    enabled: !!id,
    queryFn: async (): Promise<Classroom | null> => {
      const { data, error } = await supabase
        .from('classrooms')
        .select('*')
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useCreateClassroom() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: ClassroomInsert) => {
      const { data, error } = await supabase
        .from('classrooms')
        .insert(input)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.classrooms.all })
    },
  })
}

export function useUpdateClassroom() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: ClassroomUpdate }) => {
      const { data, error } = await supabase
        .from('classrooms')
        .update(patch)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (row) => {
      queryClient.invalidateQueries({ queryKey: keys.classrooms.all })
      queryClient.invalidateQueries({ queryKey: keys.classrooms.detail(row.id) })
    },
  })
}

export function useDeleteClassroom() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('classrooms').delete().eq('id', id)
      if (error) throw error
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.classrooms.all })
    },
  })
}
