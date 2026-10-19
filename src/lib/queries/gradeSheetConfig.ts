/**
 * Grade sheet settings (migration 0039): the per-subject grid view and export
 * layout, and the classroom's saved class-record import presets.
 *
 * Every read is parsed through src/lib/gradeSheetConfig.ts, so callers always
 * get a complete, valid config — defaults when no row exists yet.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { keys } from '@/lib/queries/keys'
import {
  DEFAULT_EXPORT_LAYOUT,
  DEFAULT_GRID_VIEW,
  parseExportLayout,
  parseGridView,
  parseImportPresetMapping,
  presetMappingToJson,
  type ExportLayout,
  type GridViewConfig,
  type ImportPresetMapping,
} from '@/lib/gradeSheetConfig'

export interface GradeSheetConfig {
  gridView: GridViewConfig
  exportLayout: ExportLayout
}

export const DEFAULT_GRADE_SHEET_CONFIG: GradeSheetConfig = {
  gridView: DEFAULT_GRID_VIEW,
  exportLayout: DEFAULT_EXPORT_LAYOUT,
}

/** Disabled without a subject: classroom-wide views use the defaults. */
export function useGradeSheetConfig(classroomId: string, courseSubjectId?: string) {
  return useQuery({
    queryKey: keys.grades.sheetConfig(classroomId, courseSubjectId ?? ''),
    enabled: !!classroomId && !!courseSubjectId,
    queryFn: async (): Promise<GradeSheetConfig> => {
      const { data, error } = await supabase
        .from('grade_sheet_configs')
        .select('grid_view, export_layout')
        .eq('classroom_id', classroomId)
        .eq('course_subject_id', courseSubjectId ?? '')
        .maybeSingle()
      if (error) throw error
      return {
        gridView: parseGridView(data?.grid_view),
        exportLayout: parseExportLayout(data?.export_layout),
      }
    },
  })
}

interface SaveGradeSheetConfigInput {
  classroomId: string
  courseSubjectId: string
  gridView?: GridViewConfig
  exportLayout?: ExportLayout
}

/**
 * Upsert one half of the config (or both). The untouched half is left as it
 * is in the database — upsert only writes the columns it is given.
 */
export function useSaveGradeSheetConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      classroomId,
      courseSubjectId,
      gridView,
      exportLayout,
    }: SaveGradeSheetConfigInput) => {
      const { error } = await supabase.from('grade_sheet_configs').upsert(
        {
          classroom_id: classroomId,
          course_subject_id: courseSubjectId,
          ...(gridView ? { grid_view: { ...gridView } } : {}),
          ...(exportLayout
            ? {
                export_layout: {
                  sheetName: exportLayout.sheetName,
                  columns: exportLayout.columns.map((column) => ({ ...column })),
                },
              }
            : {}),
        },
        { onConflict: 'course_subject_id' },
      )
      if (error) throw error
    },
    onMutate: async ({ classroomId, courseSubjectId, gridView, exportLayout }) => {
      const key = keys.grades.sheetConfig(classroomId, courseSubjectId)
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<GradeSheetConfig>(key)
      queryClient.setQueryData<GradeSheetConfig>(key, (old) => ({
        gridView: gridView ?? old?.gridView ?? DEFAULT_GRID_VIEW,
        exportLayout: exportLayout ?? old?.exportLayout ?? DEFAULT_EXPORT_LAYOUT,
      }))
      return { previous, key }
    },
    onError: (_error, _variables, context) => {
      if (context) queryClient.setQueryData(context.key, context.previous)
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({
        queryKey: keys.grades.sheetConfig(
          variables.classroomId,
          variables.courseSubjectId,
        ),
      })
    },
  })
}

export interface ImportPreset {
  id: string
  name: string
  mapping: ImportPresetMapping
  updatedAt: string
}

export function useImportPresets(classroomId: string) {
  return useQuery({
    queryKey: keys.grades.importPresets(classroomId),
    enabled: !!classroomId,
    queryFn: async (): Promise<ImportPreset[]> => {
      const { data, error } = await supabase
        .from('grade_import_presets')
        .select('id, name, mapping, updated_at')
        .eq('classroom_id', classroomId)
        .order('updated_at', { ascending: false })
      if (error) throw error
      const presets: ImportPreset[] = []
      for (const row of data ?? []) {
        const mapping = parseImportPresetMapping(row.mapping)
        // A row this build cannot read is skipped, not fatal — the other
        // presets still work and the teacher can overwrite it by name.
        if (mapping)
          presets.push({ id: row.id, name: row.name, mapping, updatedAt: row.updated_at })
      }
      return presets
    },
  })
}

/** Saving under an existing name replaces that preset's mapping. */
export function useSaveImportPreset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      classroomId,
      name,
      mapping,
    }: {
      classroomId: string
      name: string
      mapping: ImportPresetMapping
    }) => {
      const { error } = await supabase.from('grade_import_presets').upsert(
        {
          classroom_id: classroomId,
          name: name.trim(),
          mapping: presetMappingToJson(mapping),
        },
        { onConflict: 'classroom_id,name' },
      )
      if (error) throw error
    },
    onSuccess: (_data, variables) =>
      queryClient.invalidateQueries({
        queryKey: keys.grades.importPresets(variables.classroomId),
      }),
  })
}

export function useDeleteImportPreset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; classroomId: string }) => {
      const { error } = await supabase.from('grade_import_presets').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: (_data, variables) =>
      queryClient.invalidateQueries({
        queryKey: keys.grades.importPresets(variables.classroomId),
      }),
  })
}
