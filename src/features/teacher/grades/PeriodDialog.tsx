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
import { cn } from '@/lib/cn'
import { useCreatePeriod, useUpdatePeriod } from '@/lib/queries/grades'
import type { GradingPeriod } from '@/types/domain'

/** What Philippine terms are actually called, so nobody types them by hand. */
const NAME_SUGGESTIONS = [
  'Prelim',
  'Midterm',
  'Semi-Final',
  'Finals',
  '1st Quarter',
  '2nd Quarter',
  '3rd Quarter',
  '4th Quarter',
] as const

interface PeriodForm {
  name: string
  /** '' means an equal share with the other periods. */
  sharePercent: string
}

function initialState(period?: GradingPeriod): PeriodForm {
  return {
    name: period?.name ?? '',
    sharePercent: period && period.weight !== 1 ? String(period.weight) : '',
  }
}

export function PeriodDialog({
  classroomId,
  courseSubjectId,
  period,
  nextPosition,
  siblings = [],
  trigger,
}: {
  classroomId: string
  courseSubjectId: string
  period?: GradingPeriod
  nextPosition?: number
  /** The subject's other periods, used to show the resulting split. */
  siblings?: readonly GradingPeriod[]
  trigger: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<PeriodForm>(initialState(period))
  const createPeriod = useCreatePeriod()
  const updatePeriod = useUpdatePeriod()
  const { toast } = useToast()
  const isEditing = !!period

  useEffect(() => {
    if (open) setForm(initialState(period))
  }, [open, period])

  const custom = form.sharePercent.trim() !== ''
  const share = Number(form.sharePercent)
  const weight = custom ? share : 1
  const valid =
    form.name.trim().length > 0 && (!custom || (Number.isFinite(share) && share > 0))

  // What this period will actually be worth once every weight is renormalized —
  // the number the teacher cares about, which "weight: 1" never showed them.
  const others = siblings.filter((item) => item.id !== period?.id)
  const total = others.reduce((sum, item) => sum + item.weight, 0) + (weight || 0)
  const resultingShare = total > 0 ? Math.round((weight / total) * 100) : 0

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!valid) return
    try {
      const patch = {
        name: form.name.trim(),
        weight,
        // Position is an ordering detail, not a teacher's decision: new periods
        // go last, and an edited one stays where it is.
        position: period?.position ?? nextPosition ?? others.length,
      }
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
  const unused = NAME_SUGGESTIONS.filter(
    (name) => !others.some((item) => item.name.toLowerCase() === name.toLowerCase()),
  )

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
            {unused.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {unused.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setForm({ ...form, name })}
                    className="rounded-full border border-(--color-border) px-2.5 py-1 text-xs text-(--color-ink-muted) transition-colors hover:border-(--color-accent-400) hover:text-(--color-ink) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent-400)"
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-(--color-ink-muted)">
              How much does it count?
            </legend>
            <div className="flex gap-2">
              <ShareChoice
                selected={!custom}
                onSelect={() => setForm({ ...form, sharePercent: '' })}
              >
                Equal share
              </ShareChoice>
              <ShareChoice
                selected={custom}
                onSelect={() =>
                  setForm({ ...form, sharePercent: String(resultingShare || 30) })
                }
              >
                Set a percentage
              </ShareChoice>
            </div>
            {custom && (
              <div className="flex items-center gap-2">
                <Input
                  id="period-share"
                  aria-label="Share of the final grade, in percent"
                  type="number"
                  min={1}
                  max={100}
                  step={1}
                  className="w-24"
                  value={form.sharePercent}
                  onChange={(e) => setForm({ ...form, sharePercent: e.target.value })}
                />
                <span className="text-sm text-(--color-ink-muted)">
                  percent of the final grade
                </span>
              </div>
            )}
          </fieldset>

          {valid && (
            <div className="space-y-1 rounded-xl bg-(--color-surface-2) px-3 py-2 text-sm">
              {others.length === 0 ? (
                <p className="text-(--color-ink)">
                  <span className="font-medium">{form.name.trim()}</span> is your only
                  period, so it carries the whole grade. Add more and they will share it.
                </p>
              ) : (
                <p className="text-(--color-ink)">
                  <span className="font-medium">
                    {form.name.trim()} is worth about {resultingShare}%
                  </span>{' '}
                  of the final grade, next to {others.map((item) => item.name).join(', ')}
                  .
                </p>
              )}
              {/* The rule teachers actually get surprised by: an ungraded period
                  is skipped, not counted as zero. */}
              <p className="text-(--color-ink-muted)">
                A period starts counting once it has graded work, so early-term grades
                show how students are doing on what you have marked — not zeros for work
                you have not given yet.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
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

function ShareChoice({
  selected,
  onSelect,
  children,
}: {
  selected: boolean
  onSelect: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        'flex-1 rounded-xl border px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent-400)',
        selected
          ? 'border-(--color-accent-400) bg-(--color-accent-400)/10 font-medium text-(--color-ink)'
          : 'border-(--color-border) text-(--color-ink-muted) hover:text-(--color-ink)',
      )}
    >
      {children}
    </button>
  )
}
