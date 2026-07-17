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
import { useCreateCategory, useUpdateCategory } from '@/lib/queries/grades'
import type { ActivityCategory, GradeComponent } from '@/types/domain'

interface CategoryForm {
  name: string
  component: GradeComponent
  weight: string
}

function initialState(
  category?: ActivityCategory,
  defaultComponent: GradeComponent = 'lecture',
): CategoryForm {
  return {
    name: category?.name ?? '',
    component: category?.component ?? defaultComponent,
    weight: String(category?.weight ?? 1),
  }
}

export function CategoryDialog({
  classroomId,
  category,
  defaultComponent,
  trigger,
}: {
  classroomId: string
  category?: ActivityCategory
  defaultComponent?: GradeComponent
  trigger: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<CategoryForm>(initialState(category, defaultComponent))
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const { toast } = useToast()
  const isEditing = !!category

  useEffect(() => {
    if (open) setForm(initialState(category, defaultComponent))
  }, [open, category, defaultComponent])

  const weight = Number(form.weight)
  const valid = form.name.trim().length > 0 && Number.isFinite(weight) && weight > 0

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!valid) return
    try {
      const patch = { name: form.name.trim(), component: form.component, weight }
      if (isEditing) {
        await updateCategory.mutateAsync({ id: category.id, patch })
        toast({ title: 'Category updated', tone: 'success' })
      } else {
        await createCategory.mutateAsync({ classroom_id: classroomId, ...patch })
        toast({ title: 'Category added', tone: 'success' })
      }
      setOpen(false)
    } catch (error) {
      toast({
        title: isEditing ? 'Could not update category' : 'Could not add category',
        description: error instanceof Error ? error.message : undefined,
        tone: 'error',
      })
    }
  }

  const pending = createCategory.isPending || updateCategory.isPending

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit category' : 'New category'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="category-name">Name</Label>
            <Input
              id="category-name"
              required
              autoFocus
              placeholder="Quizzes"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="category-component">Component</Label>
              <Select
                value={form.component}
                onValueChange={(value) =>
                  setForm({ ...form, component: value as GradeComponent })
                }
              >
                <SelectTrigger id="category-component">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lecture">Lecture</SelectItem>
                  <SelectItem value="laboratory">Laboratory</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="category-weight">Weight</Label>
              <Input
                id="category-weight"
                type="number"
                min={0}
                step={0.01}
                required
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })}
              />
            </div>
          </div>
          <p className="text-xs text-[var(--color-ink-faint)]">
            Category weights are relative within their component and renormalize when a
            category has no graded work.
          </p>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={pending} disabled={!valid}>
              {isEditing ? 'Save changes' : 'Add category'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
