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
} from '@/types/domain'

/**
 * Fetch the full static gradebook structure for a classroom: grading periods,
 * activity categories, and activities. Ordering matches how they render in the
 * grid (periods/categories/activities by position, then name).
 */
export function useGradebookStructure(classroomId: string) {
  return useQuery({
    queryKey: keys.grades.structure(classroomId),
    enabled: !!classroomId,
    queryFn: async (): Promise<GradebookStructure> => {
      const [periods, categories, activities] = await Promise.all([
        supabase
          .from('grading_periods')
          .select('*')
          .eq('classroom_id', classroomId)
          .order('position', { ascending: true })
          .order('name', { ascending: true }),
        supabase
          .from('activity_categories')
          .select('*')
          .eq('classroom_id', classroomId)
          .order('component', { ascending: true })
          .order('name', { ascending: true }),
        supabase
          .from('activities')
          .select('*, grading_periods!inner(classroom_id)')
          .eq('grading_periods.classroom_id', classroomId)
          .order('position', { ascending: true })
          .order('name', { ascending: true }),
      ])

      if (periods.error) throw periods.error
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
        queryKey: keys.grades.structure(row.classroom_id),
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
        queryKey: keys.grades.structure(row.classroom_id),
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
        queryKey: keys.grades.structure(variables.classroomId),
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
        queryKey: keys.grades.structure(row.classroom_id),
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
        queryKey: keys.grades.structure(row.classroom_id),
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
        queryKey: keys.grades.structure(variables.classroomId),
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
        queryKey: keys.grades.structure(variables.classroomId),
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
        queryKey: keys.grades.structure(variables.classroomId),
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
        queryKey: keys.grades.structure(variables.classroomId),
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
