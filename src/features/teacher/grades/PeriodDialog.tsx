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
import { useCreatePeriod, useUpdatePeriod } from '@/lib/queries/grades'
import type { GradingPeriod } from '@/types/domain'

interface PeriodForm {
  name: string
  weight: string
  position: string
}

function initialState(period?: GradingPeriod, nextPosition = 0): PeriodForm {
  return {
    name: period?.name ?? '',
    weight: String((period?.weight ?? 1) * 100),
    position: String(period?.position ?? nextPosition),
  }
}

export function PeriodDialog({
  classroomId,
  courseSubjectId,
  period,
  nextPosition,
  trigger,
}: {
  classroomId: string
  courseSubjectId: string
  period?: GradingPeriod
  nextPosition?: number
  trigger: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<PeriodForm>(initialState(period, nextPosition))
  const createPeriod = useCreatePeriod()
  const updatePeriod = useUpdatePeriod()
  const { toast } = useToast()
  const isEditing = !!period

  useEffect(() => {
    if (open) setForm(initialState(period, nextPosition))
  }, [open, period, nextPosition])

  const percentWeight = Number(form.weight)
  const weight = percentWeight / 100
  const position = Number(form.position)
  const valid =
    form.name.trim().length > 0 &&
    Number.isFinite(percentWeight) &&
    percentWeight > 0 &&
    percentWeight <= 100 &&
    Number.isFinite(position)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!valid) return
    try {
      const patch = { name: form.name.trim(), weight, position }
      if (isEditing) {
        await updatePeriod.mutateAsync({ id: period.id, patch })
        toast({ title: 'Period updated', tone: 'success' })
      } else {
        await createPeriod.mutateAsync({
          classroom_id: classroomId,
          course_subject_id: courseSubjectId,
          ...patch,
        })
        toast({ title: 'Period added', tone: 'success' })
      }
      setOpen(false)
    } catch (error) {
      toast({
        title: isEditing ? 'Could not update period' : 'Could not add period',
        description: error instanceof Error ? error.message : undefined,
        tone: 'error',
      })
    }
  }

  const pending = createPeriod.isPending || updatePeriod.isPending

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit grading period' : 'New grading period'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="period-name">Name</Label>
            <Input
              id="period-name"
              required
              autoFocus
              placeholder="Prelim"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="period-weight">Weight (%)</Label>
              <Input
                id="period-weight"
                type="number"
                min={1}
                max={100}
                step={1}
                required
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="period-position">Position</Label>
              <Input
                id="period-position"
                type="number"
                min={0}
                step={1}
                required
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
              />
            </div>
          </div>
          <p className="text-xs text-(--color-ink-faint)">
            All grading periods together must total 100% before Agilearn can calculate a
            final grade.
          </p>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={pending} disabled={!valid}>
              {isEditing ? 'Save changes' : 'Add period'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
