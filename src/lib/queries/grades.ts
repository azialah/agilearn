import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { keys } from '@/lib/queries/keys'
import type { GradebookStructure, ScoreMap } from '@/lib/grading'
import type {
  Activity,
  ActivityCategory,
  ActivityCategoryInsert,
  ActivityCategoryUpdate,
  ActivityInsert,
  ActivityUpdate,
  GradingPeriod,
  GradingPeriodInsert,
  GradingPeriodUpdate,
  GradeComponentRecord,
  GradeComponentInsert,
  GradeComponentUpdate,
} from '@/types/domain'

export type GradeTemplate =
  'basic_education' | 'senior_high' | 'higher_education' | 'custom'

/** Seeds an editable starting structure; teachers retain full control afterwards. */
export function useSeedGradeTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      classroomId,
      courseSubjectId,
      template,
    }: {
      classroomId: string
      courseSubjectId: string
      template: GradeTemplate
    }) => {
      if (template === 'custom') return
      const periods =
        template === 'higher_education'
          ? [
              { name: 'Midterm', weight: 0.5, position: 0 },
              { name: 'Finals', weight: 0.5, position: 1 },
            ]
          : template === 'senior_high'
            ? [
                { name: 'First semester', weight: 0.5, position: 0 },
                { name: 'Second semester', weight: 0.5, position: 1 },
              ]
            : [
                { name: 'Quarter 1', weight: 0.25, position: 0 },
                { name: 'Quarter 2', weight: 0.25, position: 1 },
                { name: 'Quarter 3', weight: 0.25, position: 2 },
                { name: 'Quarter 4', weight: 0.25, position: 3 },
              ]
      const { data: createdPeriods, error: periodError } = await supabase
        .from('grading_periods')
        .insert(
          periods.map((period) => ({
            ...period,
            classroom_id: classroomId,
            course_subject_id: courseSubjectId,
          })),
        )
        .select()
      if (periodError) throw periodError
      const { data: components, error: componentError } = await supabase
        .from('grade_components')
        .select('id')
        .eq('classroom_id', classroomId)
        .eq('course_subject_id', courseSubjectId)
        .order('position')
        .limit(1)
      if (componentError) throw componentError
      const componentId = components?.[0]?.id
      if (!componentId) throw new Error('The default grade component was not created.')
      const categories: Array<{ name: string; weight: number }> =
        template === 'higher_education'
          ? [
              { name: 'Midterm quizzes', weight: 0.3 },
              { name: 'Midterm projects & activities', weight: 0.5 },
              { name: 'Midterm exam', weight: 0.2 },
              { name: 'Final activities & quizzes', weight: 0.4 },
              { name: 'Final projects', weight: 0.6 },
            ]
          : [
              { name: 'Written work', weight: 0.3 },
              { name: 'Performance tasks', weight: 0.5 },
              { name: 'Assessment', weight: 0.2 },
            ]
      const { error: categoryError } = await supabase.from('activity_categories').insert(
        categories.map(({ name, weight }, position) => ({
          classroom_id: classroomId,
          course_subject_id: courseSubjectId,
          component: 'lecture',
          grade_component_id: componentId,
          grading_period_id: name.startsWith('Midterm')
            ? (createdPeriods?.find((period) => period.name === 'Midterm')?.id ?? null)
            : name.startsWith('Final')
              ? (createdPeriods?.find((period) => period.name === 'Finals')?.id ?? null)
              : null,
          name,
          weight,
          position,
        })),
      )
      if (categoryError) throw categoryError
    },
    onSuccess: (_value, variables) =>
      queryClient.invalidateQueries({
        queryKey: keys.grades.structureBase(variables.classroomId),
      }),
  })
}

export function useCreateGradeComponent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: GradeComponentInsert) => {
      const { data, error } = await supabase
        .from('grade_components')
        .insert(input)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (row) =>
      queryClient.invalidateQueries({
        queryKey: keys.grades.structureBase(row.classroom_id),
      }),
  })
}

export function useUpdateGradeComponent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: GradeComponentUpdate }) => {
      const { data, error } = await supabase
        .from('grade_components')
        .update(patch)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (row) =>
      queryClient.invalidateQueries({
        queryKey: keys.grades.structureBase(row.classroom_id),
      }),
  })
}

export function useDeleteGradeComponent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; classroomId: string }) => {
      const { error } = await supabase.from('grade_components').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: (_result, variables) =>
      queryClient.invalidateQueries({
        queryKey: keys.grades.structureBase(variables.classroomId),
      }),
  })
}

/**
 * Fetch the full static gradebook structure for a classroom: grading periods,
 * activity categories, and activities. Ordering matches how they render in the
 * grid (periods/categories/activities by position, then name).
 */
export function useGradebookStructure(classroomId: string, courseSubjectId?: string) {
  return useQuery({
    queryKey: keys.grades.structure(classroomId, courseSubjectId),
    enabled: !!classroomId,
    queryFn: async (): Promise<GradebookStructure> => {
      let periodsQuery = supabase
        .from('grading_periods')
        .select('*')
        .eq('classroom_id', classroomId)
        .order('position', { ascending: true })
        .order('name', { ascending: true })
      if (courseSubjectId)
        periodsQuery = periodsQuery.eq('course_subject_id', courseSubjectId)
      let activitiesQuery = supabase
        .from('activities')
        .select('*, grading_periods!inner(classroom_id, course_subject_id)')
        .eq('grading_periods.classroom_id', classroomId)
        .order('position', { ascending: true })
        .order('name', { ascending: true })
      if (courseSubjectId)
        activitiesQuery = activitiesQuery.eq(
          'grading_periods.course_subject_id',
          courseSubjectId,
        )
      const [components, periods, categories, activities] = await Promise.all([
        supabase
          .from('grade_components')
          .select('*')
          .eq('classroom_id', classroomId)
          .eq('course_subject_id', courseSubjectId ?? '')
          .order('position', { ascending: true })
          .order('name', { ascending: true }),
        periodsQuery,
        supabase
          .from('activity_categories')
          .select('*')
          .eq('classroom_id', classroomId)
          .eq('course_subject_id', courseSubjectId ?? '')
          .order('component', { ascending: true })
          .order('name', { ascending: true }),
        activitiesQuery,
      ])

      if (periods.error) throw periods.error
      if (components.error) throw components.error
      if (categories.error) throw categories.error
      if (activities.error) throw activities.error

      const cleanActivities: Activity[] = (activities.data ?? []).map((row) => {
        // Strip the joined relation used only for the classroom filter.
        const { grading_periods: _relation, ...activity } = row as Activity & {
          grading_periods: unknown
        }
        return activity
      })

      return {
        periods: (periods.data ?? []) as GradingPeriod[],
        components: (components.data ?? []) as GradeComponentRecord[],
        categories: (categories.data ?? []) as ActivityCategory[],
        activities: cleanActivities,
      }
    },
  })
}

/**
 * Fetch every score for the supplied activities as a nested
 * activityId -> studentId -> score map. Disabled until at least one activity id
 * is known so we never issue an empty `.in()` query.
 */
export function useScores(classroomId: string, activityIds: string[]) {
  return useQuery({
    queryKey: keys.grades.byClassroom(classroomId),
    enabled: !!classroomId && activityIds.length > 0,
    queryFn: async (): Promise<ScoreMap> => {
      const { data, error } = await supabase
        .from('scores')
        .select('activity_id, student_id, score')
        .in('activity_id', activityIds)
      if (error) throw error

      const map: ScoreMap = {}
      for (const row of data ?? []) {
        const bucket = (map[row.activity_id] ??= {})
        bucket[row.student_id] = row.score
      }
      return map
    },
  })
}

/* -------------------------------------------------------------------------- */
/* Grading periods                                                            */
/* -------------------------------------------------------------------------- */

export function useCreatePeriod() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: GradingPeriodInsert) => {
      const { data, error } = await supabase
        .from('grading_periods')
        .insert(input)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (row) => {
      queryClient.invalidateQueries({
        queryKey: keys.grades.structureBase(row.classroom_id),
      })
    },
  })
}

export function useUpdatePeriod() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: GradingPeriodUpdate }) => {
      const { data, error } = await supabase
        .from('grading_periods')
        .update(patch)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (row) => {
      queryClient.invalidateQueries({
        queryKey: keys.grades.structureBase(row.classroom_id),
      })
    },
  })
}

export function useDeletePeriod() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; classroomId: string }) => {
      const { error } = await supabase.from('grading_periods').delete().eq('id', id)
      if (error) throw error
      return id
    },
    onSuccess: (_id, variables) => {
      queryClient.invalidateQueries({
        queryKey: keys.grades.structureBase(variables.classroomId),
      })
      queryClient.invalidateQueries({
        queryKey: keys.grades.byClassroom(variables.classroomId),
      })
    },
  })
}

/* -------------------------------------------------------------------------- */
/* Activity categories                                                        */
/* -------------------------------------------------------------------------- */

export function useCreateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: ActivityCategoryInsert) => {
      const { data, error } = await supabase
        .from('activity_categories')
        .insert(input)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (row) => {
      queryClient.invalidateQueries({
        queryKey: keys.grades.structureBase(row.classroom_id),
      })
    },
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: ActivityCategoryUpdate }) => {
      const { data, error } = await supabase
        .from('activity_categories')
        .update(patch)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (row) => {
      queryClient.invalidateQueries({
        queryKey: keys.grades.structureBase(row.classroom_id),
      })
    },
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; classroomId: string }) => {
      const { error } = await supabase.from('activity_categories').delete().eq('id', id)
      if (error) throw error
      return id
    },
    onSuccess: (_id, variables) => {
      queryClient.invalidateQueries({
        queryKey: keys.grades.structureBase(variables.classroomId),
      })
      queryClient.invalidateQueries({
        queryKey: keys.grades.byClassroom(variables.classroomId),
      })
    },
  })
}

/* -------------------------------------------------------------------------- */
/* Activities                                                                 */
/* -------------------------------------------------------------------------- */

export function useCreateActivity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ input }: { input: ActivityInsert; classroomId: string }) => {
      const { data, error } = await supabase
        .from('activities')
        .insert(input)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_row, variables) => {
      queryClient.invalidateQueries({
        queryKey: keys.grades.structureBase(variables.classroomId),
      })
    },
  })
}

export function useUpdateActivity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string
      patch: ActivityUpdate
      classroomId: string
    }) => {
      const { data, error } = await supabase
        .from('activities')
        .update(patch)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_row, variables) => {
      queryClient.invalidateQueries({
        queryKey: keys.grades.structureBase(variables.classroomId),
      })
    },
  })
}

export function useDeleteActivity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; classroomId: string }) => {
      const { error } = await supabase.from('activities').delete().eq('id', id)
      if (error) throw error
      return id
    },
    onSuccess: (_id, variables) => {
      queryClient.invalidateQueries({
        queryKey: keys.grades.structureBase(variables.classroomId),
      })
      queryClient.invalidateQueries({
        queryKey: keys.grades.byClassroom(variables.classroomId),
      })
    },
  })
}

/* -------------------------------------------------------------------------- */
/* Scores (optimistic)                                                        */
/* -------------------------------------------------------------------------- */

export interface ScoreMutationInput {
  classroomId: string
  activityId: string
  studentId: string
  score: number | null
}

/**
 * Upsert a single score with an optimistic cache write. On error the previous
 * score map is restored; the caller surfaces the rollback with a toast.
 */
export function useUpsertScore() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ activityId, studentId, score }: ScoreMutationInput) => {
      const { error } = await supabase
        .from('scores')
        .upsert(
          { activity_id: activityId, student_id: studentId, score },
          { onConflict: 'activity_id,student_id' },
        )
      if (error) throw error
    },
    onMutate: async ({ classroomId, activityId, studentId, score }) => {
      const key = keys.grades.byClassroom(classroomId)
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<ScoreMap>(key)
      queryClient.setQueryData<ScoreMap>(key, (old) => {
        const next: ScoreMap = { ...(old ?? {}) }
        next[activityId] = { ...(next[activityId] ?? {}), [studentId]: score }
        return next
      })
      return { previous, key }
    },
    onError: (_error, _variables, context) => {
      if (context) queryClient.setQueryData(context.key, context.previous)
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({
        queryKey: keys.grades.byClassroom(variables.classroomId),
      })
    },
  })
}
