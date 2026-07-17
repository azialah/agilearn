/**
 * Batch student import. Lives inside the io feature (not lib/queries) per the
 * work split. Inserts run per row so a single bad row can't sink the whole
 * import, and the caller gets a precise inserted / failed summary for its toast.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { keys } from '@/lib/queries/keys'
import type { StudentInsert } from '@/types/domain'
import type { ParsedRosterRow } from './parsing'

export interface ImportSummary {
  inserted: number
  failed: { rowNumber: number; message: string }[]
}

function toInsert(classroomId: string, row: ParsedRosterRow): StudentInsert {
  return {
    classroom_id: classroomId,
    student_no: row.studentNo,
    last_name: row.lastName,
    first_name: row.firstName,
    middle_initial: row.middleInitial || undefined,
  }
}

export function useImportStudents(classroomId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (rows: ParsedRosterRow[]): Promise<ImportSummary> => {
      const results = await Promise.allSettled(
        rows.map((row) =>
          supabase
            .from('students')
            .insert(toInsert(classroomId, row))
            .then(({ error }) => {
              if (error) throw new Error(error.message)
            }),
        ),
      )

      const failed: ImportSummary['failed'] = []
      let inserted = 0
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          inserted += 1
        } else {
          const reason = result.reason
          failed.push({
            rowNumber: rows[index].rowNumber,
            message: reason instanceof Error ? reason.message : String(reason),
          })
        }
      })

      return { inserted, failed }
    },
    onSuccess: (summary) => {
      if (summary.inserted > 0) {
        queryClient.invalidateQueries({
          queryKey: keys.students.byClassroom(classroomId),
        })
        queryClient.invalidateQueries({ queryKey: keys.classrooms.all })
      }
    },
  })
}
