import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { keys } from '@/lib/queries/keys'
import type { ModuleKind, TeachingModule, TeachingModuleUpdate } from '@/types/domain'

/** Name of the private Supabase Storage bucket that holds module files. */
export const MODULES_BUCKET = 'teaching-modules'

/** Minimal owner projection joined onto a module row. */
export interface ModuleOwner {
  id: string
  full_name: string
}

/** Minimal classroom projection joined onto a module row. */
export interface ModuleClassroom {
  id: string
  course_name: string
  course_code: string
}

/** A teaching module with its owner and (optional) classroom joined in. */
export interface ModuleWithRelations extends TeachingModule {
  owner: ModuleOwner | null
  classroom: ModuleClassroom | null
}

const MODULE_SELECT =
  '*, owner:profiles!teaching_modules_owner_id_fkey(id, full_name), ' +
  'classroom:classrooms(id, course_name, course_code)'

/** Every teaching module in the shared library, newest first. */
export function useModules() {
  return useQuery({
    queryKey: keys.modules.all,
    queryFn: async (): Promise<ModuleWithRelations[]> => {
      const { data, error } = await supabase
        .from('teaching_modules')
        .select(MODULE_SELECT)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as ModuleWithRelations[]
    },
  })
}

/** Replace unsafe characters so the object key stays a clean single segment. */
function sanitizeFilename(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
  return cleaned || 'file'
}

export interface UploadModuleInput {
  ownerId: string
  file: File
  kind: ModuleKind
  title: string
  description: string
  classroomId: string | null
  tags: string[]
  folder: string
}

/**
 * Upload a file to storage then insert its metadata row. The object key is
 * `{ownerId}/{moduleId}/{filename}` so the first path segment matches the
 * storage RLS owner check. If the metadata insert fails the just-uploaded
 * object is removed so no orphan is left behind.
 */
export function useUploadModule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: UploadModuleInput): Promise<TeachingModule> => {
      const moduleId = crypto.randomUUID()
      const filename = sanitizeFilename(input.file.name)
      const storagePath = `${input.ownerId}/${moduleId}/${filename}`
      const mimeType = input.file.type || 'application/octet-stream'

      const { error: uploadError } = await supabase.storage
        .from(MODULES_BUCKET)
        .upload(storagePath, input.file, {
          contentType: mimeType,
          upsert: false,
        })
      if (uploadError) throw uploadError

      const { data, error } = await supabase
        .from('teaching_modules')
        .insert({
          id: moduleId,
          owner_id: input.ownerId,
          classroom_id: input.classroomId,
          kind: input.kind,
          title: input.title.trim(),
          description: input.description.trim(),
          tags: input.tags,
          folder: input.folder.trim() || 'Library',
          storage_path: storagePath,
          file_size: input.file.size,
          mime_type: mimeType,
        })
        .select()
        .single()

      if (error) {
        // Roll back the orphaned object; ignore any cleanup failure.
        await supabase.storage.from(MODULES_BUCKET).remove([storagePath])
        throw error
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.modules.all })
    },
  })
}

/** Edit a module's metadata (owner or admin, enforced by RLS). */
export function useUpdateModule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TeachingModuleUpdate }) => {
      const { data, error } = await supabase
        .from('teaching_modules')
        .update(patch)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (row) => {
      queryClient.invalidateQueries({ queryKey: keys.modules.all })
      queryClient.invalidateQueries({ queryKey: keys.modules.detail(row.id) })
    },
  })
}

/** Delete a module: remove the storage object first, then the metadata row. */
export function useDeleteModule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (
      module: Pick<TeachingModule, 'id' | 'storage_path'>,
    ): Promise<string> => {
      const { error: storageError } = await supabase.storage
        .from(MODULES_BUCKET)
        .remove([module.storage_path])
      if (storageError) throw storageError

      const { error } = await supabase
        .from('teaching_modules')
        .delete()
        .eq('id', module.id)
      if (error) throw error
      return module.id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.modules.all })
    },
  })
}

export function useImportModuleToSubject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      moduleId,
      subjectId,
    }: {
      moduleId: string
      subjectId: string
    }) => {
      const { error } = await supabase
        .from('course_subject_modules')
        .upsert({ module_id: moduleId, course_subject_id: subjectId })
      if (error) throw error
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: keys.modules.bySubject(variables.subjectId),
      })
      queryClient.invalidateQueries({ queryKey: keys.modules.all })
    },
  })
}

/**
 * Mint a short-lived signed URL for downloading a private module object.
 * `download` triggers a browser download rather than inline navigation.
 */
export async function createModuleSignedUrl(
  storagePath: string,
  filename?: string,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(MODULES_BUCKET)
    .createSignedUrl(storagePath, 60, filename ? { download: filename } : undefined)
  if (error) throw error
  return data.signedUrl
}
