/**
 * Executes an {@link ImportPlan} against one subject's gradebook. Lives in the
 * io feature beside mutations.ts, for the same reason: it is an orchestration
 * of several tables that only the import wizard performs.
 *
 * Order matters — students, periods, categories and activities are created
 * first so the score upsert can reference their new ids. The steps are not one
 * transaction (there is no backend to host one), so a failure part-way reports
 * exactly what was already written. Re-running the same import is safe: the
 * planner matches everything that now exists and only writes what is missing.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { keys } from '@/lib/queries/keys'
import type { ImportPlan, Ref } from './classRecordPlan'
import { periodKey } from './classRecordPlan'

const SCORE_CHUNK = 500

export interface ImportProgress {
  students: number
  periods: number
  categories: number
  activities: number
  scores: number
}

export class ClassRecordImportError extends Error {
  readonly written: ImportProgress
  constructor(message: string, written: ImportProgress) {
    super(message)
    this.name = 'ClassRecordImportError'
    this.written = written
  }
}

interface CommitInput {
  classroomId: string
  courseSubjectId: string
  plan: ImportPlan
  onProgress?: (progress: ImportProgress) => void
}

function describe(error: { message: string; code?: string }, what: string): string {
  if (error.code === '23505') {
    return `${what}: a record with the same name already exists in this classroom (possibly under another subject). Rename it in the mapping and try again.`
  }
  return `${what}: ${error.message}`
}

export function useCommitClassRecordImport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      classroomId,
      courseSubjectId,
      plan,
      onProgress,
    }: CommitInput): Promise<ImportProgress> => {
      const written: ImportProgress = {
        students: 0,
        periods: 0,
        categories: 0,
        activities: 0,
        scores: 0,
      }
      const report = () => onProgress?.({ ...written })
      const fail = (error: { message: string; code?: string }, what: string): never => {
        throw new ClassRecordImportError(describe(error, what), { ...written })
      }

      const studentIds = new Map<string, string>()
      if (plan.students.create.length > 0) {
        const { data, error } = await supabase
          .from('students')
          .insert(
            plan.students.create.map((student) => ({
              classroom_id: classroomId,
              student_no: student.studentNo,
              last_name: student.lastName,
              first_name: student.firstName,
              middle_initial: student.middleInitial || undefined,
            })),
          )
          .select('id, student_no')
        if (error) fail(error, 'Adding students')
        const byNo = new Map(
          (data ?? []).map((row) => [row.student_no.toLowerCase(), row.id]),
        )
        for (const student of plan.students.create) {
          const id = byNo.get(student.studentNo.toLowerCase())
          if (id) studentIds.set(student.key, id)
        }
        written.students = data?.length ?? 0
        report()
      }

      const periodIds = new Map<string, string>()
      if (plan.periods.length > 0) {
        const { data, error } = await supabase
          .from('grading_periods')
          .insert(
            plan.periods.map((period) => ({
              classroom_id: classroomId,
              course_subject_id: courseSubjectId,
              name: period.name,
              weight: period.weight,
              position: period.position,
            })),
          )
          .select('id, name')
        if (error) fail(error, 'Adding grading periods')
        for (const row of data ?? []) periodIds.set(`p:${periodKey(row.name)}`, row.id)
        written.periods = data?.length ?? 0
        report()
      }

      const categoryIds = new Map<string, string>()
      if (plan.categories.length > 0) {
        const { data, error } = await supabase
          .from('activity_categories')
          .insert(
            plan.categories.map((category) => ({
              classroom_id: classroomId,
              course_subject_id: courseSubjectId,
              // Legacy enum column; the grade_component_id is what counts.
              component: 'lecture' as const,
              grade_component_id: category.componentId,
              // Shared across periods — see classRecordPlan.ts.
              grading_period_id: null,
              name: category.name,
              weight: category.weight,
              position: category.position,
            })),
          )
          .select('id, name')
        if (error) fail(error, 'Adding categories')
        for (const row of data ?? []) {
          const planned = plan.categories.find((category) => category.name === row.name)
          if (planned) categoryIds.set(planned.key, row.id)
        }
        written.categories = data?.length ?? 0
        report()
      }

      const resolve = (ref: Ref, ids: Map<string, string>, what: string): string => {
        if (ref.kind === 'existing') return ref.id
        const id = ids.get(ref.key)
        if (!id) {
          throw new ClassRecordImportError(
            `Could not resolve a newly created ${what}. Nothing after this step was written.`,
            { ...written },
          )
        }
        return id
      }

      const activityIds = new Map<string, string>()
      if (plan.activities.create.length > 0) {
        const rows = plan.activities.create.map((activity) => ({
          key: activity.key,
          grading_period_id: resolve(activity.period, periodIds, 'grading period'),
          category_id: resolve(activity.category, categoryIds, 'category'),
          name: activity.name,
          max_score: activity.maxScore,
          position: activity.position,
        }))
        const { data, error } = await supabase
          .from('activities')
          .insert(rows.map(({ key: _key, ...row }) => row))
          .select('id, name, grading_period_id, category_id')
        if (error) fail(error, 'Adding activities')
        const slot = (periodId: string, categoryId: string, name: string) =>
          `${periodId}|${categoryId}|${name.trim().toLowerCase()}`
        const byKey = new Map(
          (data ?? []).map((row) => [
            slot(row.grading_period_id, row.category_id, row.name),
            row.id,
          ]),
        )
        for (const row of rows) {
          const id = byKey.get(slot(row.grading_period_id, row.category_id, row.name))
          if (id) activityIds.set(row.key, id)
        }
        written.activities = data?.length ?? 0
        report()
      }

      const scoreRows = plan.scores.map((write) => ({
        student_id: resolve(write.student, studentIds, 'student'),
        activity_id: resolve(write.activity, activityIds, 'activity'),
        score: write.score,
      }))
      for (let start = 0; start < scoreRows.length; start += SCORE_CHUNK) {
        const chunk = scoreRows.slice(start, start + SCORE_CHUNK)
        const { error } = await supabase
          .from('scores')
          .upsert(chunk, { onConflict: 'activity_id,student_id' })
        if (error) fail(error, 'Saving scores')
        written.scores += chunk.length
        report()
      }

      return written
    },
    // Settled, not success: a part-way failure still changed the gradebook.
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({
        queryKey: keys.grades.structureBase(variables.classroomId),
      })
      queryClient.invalidateQueries({
        queryKey: keys.grades.scoresBase(variables.classroomId),
      })
      queryClient.invalidateQueries({
        queryKey: keys.students.byClassroom(variables.classroomId),
      })
      queryClient.invalidateQueries({ queryKey: keys.classrooms.all })
    },
  })
}
