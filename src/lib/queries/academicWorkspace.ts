import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { keys } from '@/lib/queries/keys'
import { supabase } from '@/lib/supabase'
import type {
  AcademicPeriod,
  AcademicPeriodInsert,
  AcademicPeriodUpdate,
  ClassroomTemplate,
  ClassroomTemplateInsert,
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

export function useUpdateAcademicPeriod() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: AcademicPeriodUpdate }) => {
      const { data, error } = await supabase
        .from('academic_periods')
        .update(patch)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: keys.academicPeriods.all }),
  })
}

export function useClassroomTemplates() {
  return useQuery({
    queryKey: keys.classroomTemplates.all,
    queryFn: async (): Promise<ClassroomTemplate[]> => {
      const { data, error } = await supabase
        .from('classroom_templates')
        .select('*')
        .order('name')
      if (error) throw error
      return data ?? []
    },
  })
}

/** Upserts on (owner_id, name) so re-saving a name overwrites that template. */
export function useSaveClassroomTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      owner_id: string
      name: string
      payload: ClassroomTemplateInsert['payload']
    }) => {
      const { data, error } = await supabase
        .from('classroom_templates')
        .upsert(
          { ...input, updated_at: new Date().toISOString() },
          { onConflict: 'owner_id,name' },
        )
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: keys.classroomTemplates.all }),
  })
}

export function useDeleteClassroomTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('classroom_templates').delete().eq('id', id)
      if (error) throw error
      return id
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: keys.classroomTemplates.all }),
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

// Meeting slots have `on delete cascade` to course_subject_id, so removing a
// subject clears its schedule with it — no separate cleanup needed here.
export function useDeleteCourseSubject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; classroomId: string }) => {
      const { error } = await supabase.from('course_subjects').delete().eq('id', id)
      if (error) throw error
      return id
    },
    onSuccess: (_id, variables) => {
      queryClient.invalidateQueries({ queryKey: keys.courseSubjects.all })
      queryClient.invalidateQueries({
        queryKey: keys.courseSubjects.byClassroom(variables.classroomId),
      })
      queryClient.invalidateQueries({ queryKey: keys.calendar.allSlots })
      queryClient.invalidateQueries({
        queryKey: keys.grades.combinations(variables.classroomId),
      })
      queryClient.invalidateQueries({
        queryKey: keys.grades.structureBase(variables.classroomId),
      })
      queryClient.invalidateQueries({
        queryKey: keys.grades.scoresBase(variables.classroomId),
      })
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
