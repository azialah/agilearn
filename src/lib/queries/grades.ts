import { useMemo } from 'react'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { keys } from '@/lib/queries/keys'
import type { GradebookStructure, ScoreMap, TransmutationTable } from '@/lib/grading'
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
  SubjectGradeCombination,
  SubjectGradeCombinationItem,
} from '@/types/domain'

export type GradeTemplate =
  'basic_education' | 'senior_high' | 'higher_education' | 'custom'

export interface SubjectGradeCombinationWithItems extends SubjectGradeCombination {
  items: SubjectGradeCombinationItem[]
}

export function useSubjectGradeCombinations(classroomId: string) {
  return useQuery({
    queryKey: keys.grades.combinations(classroomId),
    enabled: !!classroomId,
    queryFn: async (): Promise<SubjectGradeCombinationWithItems[]> => {
      const { data, error } = await supabase
        .from('subject_grade_combinations')
        .select('*, items:subject_grade_combination_items(*)')
        .eq('classroom_id', classroomId)
        .order('created_at')
        .returns<SubjectGradeCombinationWithItems[]>()
      if (error) throw error
      return data ?? []
    },
  })
}

export function useSaveSubjectGradeCombination() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      classroomId,
      name,
      items,
    }: {
      id?: string
      classroomId: string
      name: string
      items: Array<{ courseSubjectId: string; weight: number }>
    }) => {
      const { data, error } = await supabase.rpc('save_subject_grade_combination', {
        p_id: id ?? null,
        p_classroom_id: classroomId,
        p_name: name,
        p_items: items.map((item) => ({
          course_subject_id: item.courseSubjectId,
          weight: item.weight,
        })),
      })
      if (error) throw error
      return data
    },
    onSuccess: (_row, variables) => {
      queryClient.invalidateQueries({
        queryKey: keys.grades.combinations(variables.classroomId),
      })
    },
  })
}

export function useDeleteSubjectGradeCombination() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, classroomId }: { id: string; classroomId: string }) => {
      const { error } = await supabase.rpc('delete_subject_grade_combination', {
        p_id: id,
        p_classroom_id: classroomId,
      })
      if (error) throw error
    },
    onSuccess: (_value, variables) => {
      queryClient.invalidateQueries({
        queryKey: keys.grades.combinations(variables.classroomId),
      })
    },
  })
}

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
              { name: 'Midterm quizzes', weight: 0.2 },
              { name: 'Midterm projects', weight: 0.4 },
              { name: 'Midterm exam', weight: 0.4 },
              { name: 'Final quizzes', weight: 0.2 },
              { name: 'Final projects', weight: 0.4 },
              { name: 'Final exam', weight: 0.4 },
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
    queryFn: () => fetchGradebookStructure(classroomId, courseSubjectId),
  })
}

/** Shared fetcher behind both `useGradebookStructure` and `useAllGradebooks`. */
async function fetchGradebookStructure(
  classroomId: string,
  courseSubjectId?: string,
): Promise<GradebookStructure> {
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
  // course_subject_id is a non-null uuid, so the filter has to be omitted (not
  // sent as '') when no subject is scoped — `eq.` against a uuid column is a
  // 22P02 invalid-input error. Callers without a subject (the dashboard and the
  // school overview) want every subject in the classroom anyway.
  let componentsQuery = supabase
    .from('grade_components')
    .select('*')
    .eq('classroom_id', classroomId)
    .order('position', { ascending: true })
    .order('name', { ascending: true })
  if (courseSubjectId)
    componentsQuery = componentsQuery.eq('course_subject_id', courseSubjectId)

  let categoriesQuery = supabase
    .from('activity_categories')
    .select('*')
    .eq('classroom_id', classroomId)
    .order('component', { ascending: true })
    .order('name', { ascending: true })
  if (courseSubjectId)
    categoriesQuery = categoriesQuery.eq('course_subject_id', courseSubjectId)

  const [components, periods, categories, activities] = await Promise.all([
    componentsQuery,
    periodsQuery,
    categoriesQuery,
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
}

export interface ClassroomGradebook {
  classroomId: string
  structure: GradebookStructure
  scores: ScoreMap
}

export interface SubjectGradebook {
  courseSubjectId: string
  structure: GradebookStructure
  scores: ScoreMap
}

/**
 * Structure + scores for many classrooms at once, for the dashboard and the
 * school-wide admin overview. RLS decides the reach: a teacher gets their own
 * classrooms, an admin gets every one.
 *
 * This is a 2-per-classroom fan-out. It replaces hand-rolled `useQueries`
 * blocks that duplicated the two hooks above with `any` types; a Postgres view
 * would be the real fix if classroom counts ever grow large.
 */
export function useAllGradebooks(classroomIds: string[]) {
  const structureQueries = useQueries({
    queries: classroomIds.map((classroomId) => ({
      queryKey: keys.grades.structure(classroomId),
      enabled: !!classroomId,
      queryFn: () => fetchGradebookStructure(classroomId),
    })),
  })

  const scoresQueries = useQueries({
    queries: classroomIds.map((classroomId, index) => {
      const activityIds = (structureQueries[index]?.data?.activities ?? []).map(
        (activity) => activity.id,
      )
      return {
        queryKey: keys.grades.byClassroom(classroomId),
        enabled: !!classroomId && activityIds.length > 0,
        queryFn: () => fetchScores(activityIds),
      }
    }),
  })

  const isLoading =
    structureQueries.some((q) => q.isLoading) || scoresQueries.some((q) => q.isLoading)

  const structureData = structureQueries.map((q) => q.data)
  const scoreData = scoresQueries.map((q) => q.data)

  const gradebooks = useMemo(() => {
    const map = new Map<string, ClassroomGradebook>()
    classroomIds.forEach((classroomId, index) => {
      const structure = structureData[index]
      if (!structure) return
      map.set(classroomId, {
        classroomId,
        structure,
        scores: scoreData[index] ?? {},
      })
    })
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classroomIds.join(','), structureData, scoreData])

  return { gradebooks, isLoading }
}

/**
 * Loads one gradebook per subject in a classroom. Subject-scoped score keys
 * prevent a Lecture query from overwriting the Laboratory score cache.
 */
export function useSubjectGradebooks(classroomId: string, courseSubjectIds: string[]) {
  const structureQueries = useQueries({
    queries: courseSubjectIds.map((courseSubjectId) => ({
      queryKey: keys.grades.structure(classroomId, courseSubjectId),
      enabled: !!classroomId && !!courseSubjectId,
      queryFn: () => fetchGradebookStructure(classroomId, courseSubjectId),
    })),
  })

  const scoresQueries = useQueries({
    queries: courseSubjectIds.map((courseSubjectId, index) => {
      const activityIds = (structureQueries[index]?.data?.activities ?? []).map(
        (activity) => activity.id,
      )
      return {
        queryKey: keys.grades.byClassroom(classroomId, courseSubjectId),
        enabled: !!classroomId && !!courseSubjectId && activityIds.length > 0,
        queryFn: () => fetchScores(activityIds),
      }
    }),
  })

  const gradebooks = useMemo(() => {
    const map = new Map<string, SubjectGradebook>()
    courseSubjectIds.forEach((courseSubjectId, index) => {
      const structure = structureQueries[index]?.data
      if (!structure) return
      map.set(courseSubjectId, {
        courseSubjectId,
        structure,
        scores: scoresQueries[index]?.data ?? {},
      })
    })
    return map
    // `useQueries` returns a stable result array keyed by each subject query.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseSubjectIds.join(','), structureQueries, scoresQueries])

  return {
    gradebooks,
    isLoading:
      structureQueries.some((query) => query.isLoading) ||
      scoresQueries.some((query) => query.isLoading),
  }
}

/**
 * Fetch every score for the supplied activities as a nested
 * activityId -> studentId -> score map. Disabled until at least one activity id
 * is known so we never issue an empty `.in()` query.
 */
export function useScores(
  classroomId: string,
  activityIds: string[],
  courseSubjectId?: string,
) {
  return useQuery({
    queryKey: keys.grades.byClassroom(classroomId, courseSubjectId),
    enabled: !!classroomId && activityIds.length > 0,
    queryFn: () => fetchScores(activityIds),
  })
}

/** Shared fetcher behind both `useScores` and `useAllGradebooks`. */
async function fetchScores(activityIds: string[]): Promise<ScoreMap> {
  if (activityIds.length === 0) return {}
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
}

/* -------------------------------------------------------------------------- */
/* Transmutation tables                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Resolves an explicit table id, or the `is_default = true` table when
 * `tableId` is undefined (a subject with `transmutation_table_id: null`).
 * Reshapes rows into the plain band-array shape `grading.ts`'s pure
 * `transmuteGrade`/`computeTransmutedStudentGradebook` expect — the same
 * "assemble a plain structure from separate queries" pattern
 * `fetchGradebookStructure` already uses.
 */
export function useTransmutationTable(tableId?: string, enabled = true) {
  return useQuery({
    queryKey: keys.grades.transmutationTable(tableId),
    enabled,
    queryFn: async (): Promise<TransmutationTable> => {
      const tableQuery = tableId
        ? supabase.from('transmutation_tables').select('id').eq('id', tableId).single()
        : supabase
            .from('transmutation_tables')
            .select('id')
            .eq('is_default', true)
            .single()
      const { data: table, error: tableError } = await tableQuery
      if (tableError) throw tableError

      const { data: bands, error: bandsError } = await supabase
        .from('transmutation_bands')
        .select('min_percent, max_percent, transmuted_grade')
        .eq('table_id', table.id)
        .order('min_percent', { ascending: true })
      if (bandsError) throw bandsError

      return (bands ?? []).map((band) => ({
        minPercent: band.min_percent,
        maxPercent: band.max_percent,
        transmutedGrade: band.transmuted_grade,
      }))
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
        queryKey: keys.grades.scoresBase(variables.classroomId),
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
        queryKey: keys.grades.scoresBase(variables.classroomId),
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
        queryKey: keys.grades.scoresBase(variables.classroomId),
      })
    },
  })
}

/* -------------------------------------------------------------------------- */
/* Scores (optimistic)                                                        */
/* -------------------------------------------------------------------------- */

export interface ScoreMutationInput {
  classroomId: string
  courseSubjectId?: string
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
    onMutate: async ({ classroomId, courseSubjectId, activityId, studentId, score }) => {
      const key = keys.grades.byClassroom(classroomId, courseSubjectId)
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
        queryKey: keys.grades.scoresBase(variables.classroomId),
      })
    },
  })
}
