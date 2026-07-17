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
import { useToast } from '@/components/ui/toast'
import { useCreateSession, useUpdateSession } from '@/lib/queries/attendance'
import type { ClassSession } from '@/types/domain'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

interface FormState {
  session_date: string
  title: string
  notes: string
}

function initialState(session?: ClassSession): FormState {
  return {
    session_date: session?.session_date ?? today(),
    title: session?.title ?? '',
    notes: session?.notes ?? '',
  }
}

export function SessionFormDialog({
  classroomId,
  session,
  trigger,
}: {
  classroomId: string
  session?: ClassSession
  trigger: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(initialState(session))
  const createSession = useCreateSession()
  const updateSession = useUpdateSession()
  const { toast } = useToast()
  const isEditing = !!session

  useEffect(() => {
    if (open) setForm(initialState(session))
  }, [open, session])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const patch = {
      session_date: form.session_date,
      title: form.title.trim(),
      notes: form.notes.trim(),
    }
    try {
      if (isEditing) {
        await updateSession.mutateAsync({ id: session.id, patch })
        toast({ title: 'Session updated', tone: 'success' })
      } else {
        await createSession.mutateAsync({ ...patch, classroom_id: classroomId })
        toast({ title: 'Session created', tone: 'success' })
      }
      setOpen(false)
    } catch (error) {
      toast({
        title: isEditing ? 'Could not update session' : 'Could not create session',
        description: error instanceof Error ? error.message : undefined,
        tone: 'error',
      })
    }
  }

  const pending = createSession.isPending || updateSession.isPending

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit session' : 'New session'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="session_date">Date</Label>
            <Input
              id="session_date"
              type="date"
              required
              value={form.session_date}
              onChange={(e) => setForm({ ...form, session_date: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="e.g. Lecture 4 — Recursion"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 py-2 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] transition-colors focus-visible:border-[var(--color-accent-400)] focus-visible:outline-none"
              placeholder="Optional context for this session"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              {isEditing ? 'Save changes' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
