import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { keys } from '@/lib/queries/keys'
import { supabase } from '@/lib/supabase'
import type {
  AcademicPeriod,
  AcademicPeriodInsert,
  CourseSubject,
  CourseSubjectInsert,
  CourseSubjectUpdate,
} from '@/types/domain'

export function useAcademicPeriods() {
  return useQuery({
    queryKey: keys.academicPeriods.all,
    queryFn: async (): Promise<AcademicPeriod[]> => {
      const { data, error } = await supabase
        .from('academic_periods')
        .select('*')
        .order('status')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useCreateAcademicPeriod() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: AcademicPeriodInsert) => {
      const { data, error } = await supabase
        .from('academic_periods')
        .insert(input)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: keys.academicPeriods.all }),
  })
}

export function useCourseSubjects(classroomId: string) {
  return useQuery({
    queryKey: keys.courseSubjects.byClassroom(classroomId),
    enabled: !!classroomId,
    queryFn: async (): Promise<CourseSubject[]> => {
      const { data, error } = await supabase
        .from('course_subjects')
        .select('*')
        .eq('classroom_id', classroomId)
        .order('position')
        .order('name')
      if (error) throw error
      return data ?? []
    },
  })
}

export function useAllCourseSubjects() {
  return useQuery({
    queryKey: keys.courseSubjects.all,
    queryFn: async (): Promise<CourseSubject[]> => {
      const { data, error } = await supabase
        .from('course_subjects')
        .select('*')
        .order('updated_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useCreateCourseSubject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CourseSubjectInsert) => {
      const { data, error } = await supabase
        .from('course_subjects')
        .insert(input)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (subject) => {
      queryClient.invalidateQueries({ queryKey: keys.courseSubjects.all })
      queryClient.invalidateQueries({
        queryKey: keys.courseSubjects.byClassroom(subject.classroom_id),
      })
    },
  })
}

export function useUpdateCourseSubject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: CourseSubjectUpdate }) => {
      const { data, error } = await supabase
        .from('course_subjects')
        .update(patch)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (subject) => {
      queryClient.invalidateQueries({ queryKey: keys.courseSubjects.all })
      queryClient.invalidateQueries({
        queryKey: keys.courseSubjects.byClassroom(subject.classroom_id),
      })
      queryClient.invalidateQueries({ queryKey: keys.courseSubjects.detail(subject.id) })
    },
  })
}

export function useAdoptLegacyClassroom() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (classroomId: string) => {
      const { data, error } = await supabase.rpc('adopt_legacy_classroom', {
        p_classroom_id: classroomId,
      })
      if (error) throw error
      return data
    },
    onSuccess: (_subjectId, classroomId) => {
      queryClient.invalidateQueries({ queryKey: keys.classrooms.all })
      queryClient.invalidateQueries({ queryKey: keys.classrooms.detail(classroomId) })
      queryClient.invalidateQueries({
        queryKey: keys.courseSubjects.byClassroom(classroomId),
      })
      queryClient.invalidateQueries({ queryKey: keys.academicPeriods.all })
    },
  })
}
