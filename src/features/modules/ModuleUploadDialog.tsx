import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { useToast } from '@/components/ui/toast'
import { useClassrooms } from '@/lib/queries/classrooms'
import { useUploadModule } from '@/lib/queries/modules'
import type { ModuleKind } from '@/types/domain'
import { formatFileSize, MODULE_KIND_META, MODULE_KINDS } from './helpers'

const NO_CLASSROOM = '__none__'

interface FormState {
  kind: ModuleKind
  title: string
  description: string
  classroomId: string
}

const initialForm: FormState = {
  kind: 'lesson_plan',
  title: '',
  description: '',
  classroomId: NO_CLASSROOM,
}

export function ModuleUploadDialog({
  ownerId,
  trigger,
}: {
  ownerId: string
  trigger: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(initialForm)
  const [file, setFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { data: classrooms } = useClassrooms()
  const uploadModule = useUploadModule()
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      setForm(initialForm)
      setFile(null)
    }
  }, [open])

  function pickFile(next: File | null) {
    setFile(next)
    if (next && !form.title.trim()) {
      const base = next.name.replace(/\.[^.]+$/, '')
      setForm((f) => ({ ...f, title: base }))
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!file || !form.title.trim()) return
    try {
      await uploadModule.mutateAsync({
        ownerId,
        file,
        kind: form.kind,
        title: form.title,
        description: form.description,
        classroomId: form.classroomId === NO_CLASSROOM ? null : form.classroomId,
      })
      toast({ title: 'Module uploaded', tone: 'success' })
      setOpen(false)
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : undefined,
        tone: 'error',
      })
    }
  }

  const pending = uploadModule.isPending

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload module</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="module-file">File</Label>
            <input
              ref={fileInputRef}
              id="module-file"
              type="file"
              required
              className="sr-only"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-md)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-1)] px-3 py-3 text-left text-sm transition-colors hover:border-[var(--color-accent-400)]"
            >
              {file ? (
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[var(--color-ink)]">
                    {file.name}
                  </span>
                  <span className="text-xs text-[var(--color-ink-faint)]">
                    {formatFileSize(file.size)}
                  </span>
                </span>
              ) : (
                <span className="text-[var(--color-ink-faint)]">
                  Choose a file to upload
                </span>
              )}
              <span className="shrink-0 rounded-[var(--radius-sm)] bg-[var(--color-surface-3)] px-2 py-1 text-xs text-[var(--color-ink-muted)]">
                Browse
              </span>
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="module-kind">Kind</Label>
              <Select
                value={form.kind}
                onValueChange={(value) => setForm({ ...form, kind: value as ModuleKind })}
              >
                <SelectTrigger id="module-kind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODULE_KINDS.map((kind) => (
                    <SelectItem key={kind} value={kind}>
                      {MODULE_KIND_META[kind].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="module-classroom">Classroom (optional)</Label>
              <Select
                value={form.classroomId}
                onValueChange={(value) => setForm({ ...form, classroomId: value })}
              >
                <SelectTrigger id="module-classroom">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CLASSROOM}>No classroom</SelectItem>
                  {(classrooms ?? []).map((classroom) => (
                    <SelectItem key={classroom.id} value={classroom.id}>
                      {classroom.course_code} · {classroom.course_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="module-title">Title</Label>
            <Input
              id="module-title"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="module-description">Description</Label>
            <textarea
              id="module-description"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 py-2 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] transition-colors focus-visible:border-[var(--color-accent-400)] focus-visible:outline-none"
              placeholder="What is this module and how is it used?"
            />
          </div>

          <AnimatePresence>
            {pending && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-3)]">
                  <motion.div
                    className="h-full w-1/3 rounded-full bg-[var(--color-accent-400)]"
                    animate={{ x: ['-120%', '360%'] }}
                    transition={{
                      duration: 1.1,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-[var(--color-ink-muted)]">
                  Uploading {file ? formatFileSize(file.size) : ''}…
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={pending}
              disabled={!file || !form.title.trim()}
            >
              Upload
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
