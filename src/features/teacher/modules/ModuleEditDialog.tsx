import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
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
import { useUpdateModule, type ModuleWithRelations } from '@/lib/queries/modules'
import type { ModuleKind } from '@/types/domain'
import { MODULE_KIND_META, MODULE_KINDS } from './helpers'

const NO_CLASSROOM = '__none__'

interface FormState {
  kind: ModuleKind
  title: string
  description: string
  classroomId: string
}

function initialState(module: ModuleWithRelations): FormState {
  return {
    kind: module.kind,
    title: module.title,
    description: module.description,
    classroomId: module.classroom_id ?? NO_CLASSROOM,
  }
}

export function ModuleEditDialog({
  module,
  trigger,
}: {
  module: ModuleWithRelations
  trigger: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(() => initialState(module))
  const { data: classrooms } = useClassrooms()
  const updateModule = useUpdateModule()
  const { toast } = useToast()

  useEffect(() => {
    if (open) setForm(initialState(module))
  }, [open, module])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!form.title.trim()) return
    try {
      await updateModule.mutateAsync({
        id: module.id,
        patch: {
          kind: form.kind,
          title: form.title.trim(),
          description: form.description.trim(),
          classroom_id: form.classroomId === NO_CLASSROOM ? null : form.classroomId,
        },
      })
      toast({ title: 'Module updated', tone: 'success' })
      setOpen(false)
    } catch (error) {
      toast({
        title: 'Could not update module',
        description: error instanceof Error ? error.message : undefined,
        tone: 'error',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit module</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-module-kind">Kind</Label>
              <Select
                value={form.kind}
                onValueChange={(value) => setForm({ ...form, kind: value as ModuleKind })}
              >
                <SelectTrigger id="edit-module-kind">
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
              <Label htmlFor="edit-module-classroom">Classroom (optional)</Label>
              <Select
                value={form.classroomId}
                onValueChange={(value) => setForm({ ...form, classroomId: value })}
              >
                <SelectTrigger id="edit-module-classroom">
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
            <Label htmlFor="edit-module-title">Title</Label>
            <Input
              id="edit-module-title"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-module-description">Description</Label>
            <textarea
              id="edit-module-description"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full resize-none rounded-md border border-(--color-border) bg-(--color-surface-1) px-3 py-2 text-sm text-(--color-ink) placeholder:text-(--color-ink-faint) transition-colors focus-visible:border-(--color-accent-400) focus-visible:outline-none"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              loading={updateModule.isPending}
              disabled={!form.title.trim()}
            >
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
