/**
 * Posted grades (migration 0040): finished Lecture / Laboratory / term grades
 * imported from a teacher's own sheet, plus the grade-email send history and
 * the call into the `send-grade-emails` Edge Function.
 *
 * Posted grades are stored and shown exactly as imported — they never feed
 * public.scores or the grade engine in src/lib/grading.ts.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { keys } from '@/lib/queries/keys'
import type { GradeEmailLog, PostedGrade, PostedGradeInsert } from '@/types/domain'

export function usePostedGrades(classroomId: string) {
  return useQuery({
    queryKey: keys.grades.posted(classroomId),
    enabled: !!classroomId,
    queryFn: async (): Promise<PostedGrade[]> => {
      const { data, error } = await supabase
        .from('posted_grades')
        .select('*')
        .eq('classroom_id', classroomId)
        .order('updated_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

interface UpsertPostedGradesInput {
  classroomId: string
  rows: PostedGradeInsert[]
}

/** Upserts on (subject, student, term): re-importing a term replaces it. */
export function useUpsertPostedGrades() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ rows }: UpsertPostedGradesInput) => {
      if (rows.length === 0) return
      const { error } = await supabase
        .from('posted_grades')
        .upsert(rows, { onConflict: 'course_subject_id,student_id,term' })
      if (error) throw error
    },
    onSettled: (_data, _error, variables) =>
      queryClient.invalidateQueries({
        queryKey: keys.grades.posted(variables.classroomId),
      }),
  })
}

/** Removes every posted grade for one subject + term. */
export function useDeletePostedTerm() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      courseSubjectId,
      term,
    }: {
      classroomId: string
      courseSubjectId: string
      term: string
    }) => {
      const { error } = await supabase
        .from('posted_grades')
        .delete()
        .eq('course_subject_id', courseSubjectId)
        .eq('term', term)
      if (error) throw error
    },
    onSuccess: (_data, variables) =>
      queryClient.invalidateQueries({
        queryKey: keys.grades.posted(variables.classroomId),
      }),
  })
}

export function useGradeEmailLog(
  classroomId: string,
  courseSubjectId: string,
  term: string,
) {
  return useQuery({
    queryKey: keys.grades.emailLog(classroomId, courseSubjectId, term),
    enabled: !!classroomId && !!courseSubjectId && !!term,
    queryFn: async (): Promise<GradeEmailLog[]> => {
      const { data, error } = await supabase
        .from('grade_email_log')
        .select('*')
        .eq('classroom_id', classroomId)
        .eq('course_subject_id', courseSubjectId)
        .eq('term', term)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

export interface SendGradeEmailsInput {
  classroomId: string
  courseSubjectId: string
  term: string
  studentIds: string[]
  /** Send again to students already emailed for this subject + term. */
  resend?: boolean
}

export interface SendGradeEmailsResult {
  sent: { studentId: string; recipient: string }[]
  skipped: { studentId: string; reason: string }[]
  failed: { studentId: string; error: string }[]
}

/**
 * Invokes the `send-grade-emails` Edge Function. Only ids cross the wire; the
 * function reads every address and grade itself under the caller's RLS.
 */
export function useSendGradeEmails() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: SendGradeEmailsInput): Promise<SendGradeEmailsResult> => {
      const { data, error } = await supabase.functions.invoke<SendGradeEmailsResult>(
        'send-grade-emails',
        { body: input },
      )
      if (error) {
        // Surface the function's own message ("Set the student email domain…")
        // instead of the generic "non-2xx status code".
        if (error instanceof FunctionsHttpError) {
          const body: unknown = await error.context.json().catch(() => null)
          if (body && typeof body === 'object' && 'error' in body) {
            throw new Error(String(body.error))
          }
        }
        throw error
      }
      if (!data) throw new Error('The email service returned no result.')
      return data
    },
    onSettled: (_data, _error, variables) =>
      queryClient.invalidateQueries({
        queryKey: keys.grades.emailLog(
          variables.classroomId,
          variables.courseSubjectId,
          variables.term,
        ),
      }),
  })
}
