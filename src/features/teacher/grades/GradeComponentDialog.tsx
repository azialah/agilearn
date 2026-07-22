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
import { useCreateGradeComponent, useUpdateGradeComponent } from '@/lib/queries/grades'
import type { GradeComponentRecord } from '@/types/domain'

export function GradeComponentDialog({
  classroomId,
  courseSubjectId,
  component,
  nextPosition = 0,
  trigger,
}: {
  classroomId: string
  courseSubjectId: string
  component?: GradeComponentRecord
  nextPosition?: number
  trigger: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(component?.name ?? '')
  const [weight, setWeight] = useState(String(component?.weight ?? 1))
  const create = useCreateGradeComponent()
  const update = useUpdateGradeComponent()
  const { toast } = useToast()
  useEffect(() => {
    if (open) {
      setName(component?.name ?? '')
      setWeight(String(component?.weight ?? 1))
    }
  }, [open, component])
  const numericWeight = Number(weight)
  const valid =
    name.trim().length > 0 &&
    Number.isFinite(numericWeight) &&
    numericWeight > 0 &&
    numericWeight <= 1
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!valid) return
    try {
      if (component)
        await update.mutateAsync({
          id: component.id,
          patch: { name: name.trim(), weight: numericWeight },
        })
      else
        await create.mutateAsync({
          classroom_id: classroomId,
          course_subject_id: courseSubjectId,
          name: name.trim(),
          weight: numericWeight,
          position: nextPosition,
        })
      toast({
        title: component ? 'Component updated' : 'Component added',
        tone: 'success',
      })
      setOpen(false)
    } catch (error) {
      toast({
        title: 'Could not save component',
        description: error instanceof Error ? error.message : undefined,
        tone: 'error',
      })
    }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {component ? 'Edit grade component' : 'New grade component'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="component-name">Name</Label>
            <Input
              id="component-name"
              value={name}
              placeholder="e.g. Performance"
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="component-weight">Weight</Label>
            <Input
              id="component-weight"
              type="number"
              min={0.01}
              max={1}
              step={0.01}
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
            />
          </div>
          <p className="text-xs text-[var(--color-ink-faint)]">
            Components combine into the class grade. Their weights are normalized across
            the class.
          </p>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              loading={create.isPending || update.isPending}
              disabled={!valid}
            >
              {component ? 'Save changes' : 'Add component'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
