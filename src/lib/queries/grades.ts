import { useMemo } from 'react'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { keys } from '@/lib/queries/keys'
import { enqueueWrite } from '@/lib/offlineQueue'
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

  // Scoring policy is per subject (migration 0036), so it can only be resolved
  // when one is scoped. Classroom-wide callers (dashboard, school overview) get
  // `policy: undefined`, which is the historical math — no floor, ungraded work
  // excluded. This is the single choke point every gradebook consumer routes
  // through, so populating it here covers the grid, the summary and both
  // exporters at once.
  const policyQuery = courseSubjectId
    ? supabase
        .from('course_subjects')
        .select('grade_floor, ungraded_as_zero')
        .eq('id', courseSubjectId)
        .maybeSingle()
    : null

  const [components, periods, categories, activities, policy] = await Promise.all([
    componentsQuery,
    periodsQuery,
    categoriesQuery,
    activitiesQuery,
    policyQuery,
  ])

  if (periods.error) throw periods.error
  if (components.error) throw components.error
  if (categories.error) throw categories.error
  if (activities.error) throw activities.error
  // Deliberately NOT thrown. The four queries above are the gradebook; this one
  // is an optional refinement on top of it, so a failure here must degrade to
  // the historical math rather than blank every grade on the page. It also
  // makes the deploy order safe: shipping the app before migration 0036 lands
  // would otherwise take the whole grade sheet down with a 42703.
  if (policy?.error) {
    console.warn(
      'Scoring policy unavailable, falling back to raw percentages. ' +
        'Apply migration 0036_course_subject_scoring_policy.sql to enable it.',
      policy.error.message,
    )
  }

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
    policy:
      policy?.data && !policy.error
        ? {
            floor: policy.data.grade_floor,
            ungradedAsZero: policy.data.ungraded_as_zero,
          }
        : undefined,
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

/** One classroom-keyed bucket per table, assembled from the five whole-scope
 *  reads below. */
interface AllGradebooksPayload {
  periods: Map<string, GradingPeriod[]>
  components: Map<string, GradeComponentRecord[]>
  categories: Map<string, ActivityCategory[]>
  activities: Map<string, Activity[]>
  scores: Map<string, ScoreMap>
}

function bucket<T>(rows: T[], keyOf: (row: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const row of rows) {
    const key = keyOf(row)
    const list = map.get(key)
    if (list) list.push(row)
    else map.set(key, [row])
  }
  return map
}

/**
 * Everything the caller can see, in FIVE queries total rather than five per
 * classroom.
 *
 * No classroom filter is sent because RLS already decides the reach: a teacher
 * gets their own classrooms, an admin gets the whole school. That is the same
 * data the per-classroom loop fetched, just not split into N round trips.
 *
 * grading_periods, grade_components and activity_categories already carry
 * classroom_id. activities and scores do not, which is exactly why migration
 * 0021 created v_gradebook_activities / v_gradebook_scores - both declared
 * security_invoker, so RLS still applies through them.
 */
async function fetchAllGradebooks(
  classroomIds: readonly string[],
): Promise<AllGradebooksPayload> {
  // Filter in the query, not in JS. RLS would already stop a teacher seeing
  // anyone else's rows, but an admin's reach is the whole school -- without
  // this, opening the dashboard pulled every score row in the institution and
  // then threw most of them away.
  const ids = [...classroomIds]
  const [periods, components, categories, activities, scores] = await Promise.all([
    supabase
      .from('grading_periods')
      .select('*')
      .in('classroom_id', ids)
      .order('position', { ascending: true })
      .order('name', { ascending: true }),
    supabase
      .from('grade_components')
      .select('*')
      .in('classroom_id', ids)
      .order('position', { ascending: true })
      .order('name', { ascending: true }),
    supabase
      .from('activity_categories')
      .select('*')
      .in('classroom_id', ids)
      .order('component', { ascending: true })
      .order('name', { ascending: true }),
    supabase
      .from('v_gradebook_activities')
      .select(
        'id, grading_period_id, category_id, name, max_score, date, position, classroom_id',
      )
      .in('classroom_id', ids)
      .order('position', { ascending: true })
      .order('name', { ascending: true }),
    supabase
      .from('v_gradebook_scores')
      .select('activity_id, student_id, score, classroom_id')
      .in('classroom_id', ids),
  ])

  if (periods.error) throw periods.error
  if (components.error) throw components.error
  if (categories.error) throw categories.error
  if (activities.error) throw activities.error
  if (scores.error) throw scores.error

  const activitiesByClassroom = new Map<string, Activity[]>()
  for (const row of activities.data ?? []) {
    // Drop the denormalized column so what lands in the structure is a plain
    // Activity, identical to what the per-classroom fetcher produced.
    const { classroom_id: classroomId, ...activity } = row
    if (!classroomId) continue
    const list = activitiesByClassroom.get(classroomId)
    if (list) list.push(activity as Activity)
    else activitiesByClassroom.set(classroomId, [activity as Activity])
  }

  const scoresByClassroom = new Map<string, ScoreMap>()
  for (const row of scores.data ?? []) {
    if (!row.classroom_id || !row.activity_id || !row.student_id) continue
    const map = scoresByClassroom.get(row.classroom_id) ?? {}
    const activityScores = (map[row.activity_id] ??= {})
    activityScores[row.student_id] = row.score
    scoresByClassroom.set(row.classroom_id, map)
  }

  return {
    periods: bucket((periods.data ?? []) as GradingPeriod[], (row) => row.classroom_id),
    components: bucket(
      (components.data ?? []) as GradeComponentRecord[],
      (row) => row.classroom_id,
    ),
    categories: bucket(
      (categories.data ?? []) as ActivityCategory[],
      (row) => row.classroom_id,
    ),
    activities: activitiesByClassroom,
    scores: scoresByClassroom,
  }
}

/**
 * Structure + scores for many classrooms at once, for the dashboard and the
 * school-wide admin overview.
 *
 * Five queries regardless of how many classrooms are asked for. The previous
 * implementation issued five PER classroom across two sequential waves, so the
 * admin overview - which asks for every classroom in the school - spent
 * hundreds of round trips before it could paint.
 *
 * policy is intentionally left undefined. Scoring policy lives on the subject,
 * and a classroom-wide structure can span several subjects with different
 * policies, so there is no single correct one to apply.
 *
 * ponytail: the visible consequence is that once a subject sets a grade floor,
 * the dashboard and school overview show a raw percentage where the grades page
 * shows the floored figure for the same student. Acceptable while these two
 * surfaces are at-a-glance summaries. If that becomes confusing, the fix is a
 * sixth query for course_subjects policies plus applying one only where a
 * classroom has exactly one subject -- not applying an arbitrary subject's.
 */
export function useAllGradebooks(classroomIds: string[]) {
  const query = useQuery({
    queryKey: keys.grades.allGradebooks(classroomIds),
    enabled: classroomIds.length > 0,
    queryFn: () => fetchAllGradebooks(classroomIds),
    // This key is not classroom-scoped, so the per-classroom invalidations the
    // grade mutations fire cannot reach it. Rather than adding a nineteenth
    // invalidation call to every write path, refetch whenever the dashboard or
    // overview mounts — which is exactly when a teacher returns from editing.
    // Cheap now: five queries where this used to be five per classroom.
    staleTime: 0,
  })

  const data = query.data
  const gradebooks = useMemo(() => {
    const map = new Map<string, ClassroomGradebook>()
    if (!data) return map
    for (const classroomId of classroomIds) {
      if (!classroomId) continue
      map.set(classroomId, {
        classroomId,
        structure: {
          periods: data.periods.get(classroomId) ?? [],
          components: data.components.get(classroomId) ?? [],
          categories: data.categories.get(classroomId) ?? [],
          activities: data.activities.get(classroomId) ?? [],
        },
        scores: data.scores.get(classroomId) ?? {},
      })
    }
    return map
    // classroomIds is a fresh array every render; its contents are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classroomIds.join(','), data])

  return { gradebooks, isLoading: query.isLoading }
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

/** Every conversion table, for the subject form's picker. Shared reference
 *  data readable by any authenticated user (migration 0031), so it is not
 *  classroom-scoped. */
export function useTransmutationTables() {
  return useQuery({
    queryKey: keys.grades.transmutationTables,
    queryFn: async (): Promise<{ id: string; name: string }[]> => {
      const { data, error } = await supabase
        .from('transmutation_tables')
        .select('id, name')
        .order('name', { ascending: true })
      if (error) throw error
      return data ?? []
    },
  })
}

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
  /** "Ana Cruz - Quiz 1", used only if the write has to be parked offline. */
  label?: string
}

/** Supabase surfaces a dropped connection as a TypeError from fetch. */
function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) return true
  const message = error instanceof Error ? error.message : String(error)
  return /fetch|network|Failed to fetch/i.test(message)
}

/**
 * Park a failed score write when the network is what failed.
 *
 * Same contract as the attendance queue: a network failure is not a lost edit,
 * anything else (RLS, the max_score trigger from migration 0019, a bad payload)
 * is a real error and must roll back and surface.
 */
async function queueScoreIfOffline(
  input: ScoreMutationInput,
  label: string,
  error: unknown,
): Promise<boolean> {
  if (!(!navigator.onLine || isNetworkError(error))) return false
  await enqueueWrite({
    id: `score:${input.activityId}:${input.studentId}`,
    table: 'scores',
    payload: {
      activity_id: input.activityId,
      student_id: input.studentId,
      score: input.score,
    },
    onConflict: 'activity_id,student_id',
    // scores.updated_at exists (0003) but is not in the ScoreMap the grid
    // holds, so there is no captured base to compare against. Null means "this
    // row was new"; resolveWrite then parks it if the server already has one,
    // which is the safe direction for a grade.
    baseUpdatedAt: null,
    queuedAt: Date.now(),
    label,
  })
  window.dispatchEvent(new Event('agilearn-queue-changed'))
  return true
}

/**
 * Upsert a single score with an optimistic cache write.
 *
 * Offline, the edit is parked in IndexedDB and replayed on reconnect instead of
 * being rolled back — a teacher entering marks without a signal keeps their
 * work, the same guarantee attendance already had. On any other failure the
 * previous score map is restored and the caller surfaces it with a toast.
 */
export function useUpsertScore() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: ScoreMutationInput) => {
      const { error } = await supabase.from('scores').upsert(
        {
          activity_id: input.activityId,
          student_id: input.studentId,
          score: input.score,
        },
        { onConflict: 'activity_id,student_id' },
      )
      if (!error) return
      // Parked, not failed: resolving here keeps the optimistic value on screen
      // and stops call-level onError handlers from toasting "could not save"
      // next to the success toast the caller also shows.
      if (await queueScoreIfOffline(input, scoreLabel(input), error)) return
      throw error
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
      // Only real failures reach here now; a queued write resolves as a success.
      if (context) queryClient.setQueryData(context.key, context.previous)
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({
        queryKey: keys.grades.scoresBase(variables.classroomId),
      })
    },
  })
}

/** Shown verbatim in the conflict row, so it has to name the work, not the
 *  uuids. The caller knows the activity and student names; fall back to the
 *  ids when it does not. */
function scoreLabel(input: ScoreMutationInput): string {
  if (input.label) return input.label
  return `Score for student ${input.studentId}`
}
