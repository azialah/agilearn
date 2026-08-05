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
import type { ActivityCategory, GradeComponentRecord } from '@/types/domain'

interface CategoryForm {
  name: string
  grade_component_id: string
  weight: string
}

function initialState(
  category?: ActivityCategory,
  defaultComponentId = '',
): CategoryForm {
  return {
    name: category?.name ?? '',
    grade_component_id: category?.grade_component_id ?? defaultComponentId,
    weight: String((category?.weight ?? 1) * 100),
  }
}

export function CategoryDialog({
  classroomId,
  courseSubjectId,
  periodId,
  components,
  category,
  defaultComponentId,
  trigger,
}: {
  classroomId: string
  courseSubjectId: string
  periodId: string
  components: GradeComponentRecord[]
  category?: ActivityCategory
  defaultComponentId?: string
  trigger: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<CategoryForm>(
    initialState(category, defaultComponentId),
  )
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const { toast } = useToast()
  const isEditing = !!category
  const isLegacyCategory = category?.grade_component_id === null

  useEffect(() => {
    if (open) setForm(initialState(category, defaultComponentId))
  }, [open, category, defaultComponentId])

  const percentWeight = Number(form.weight)
  const weight = percentWeight / 100
  const valid =
    form.name.trim().length > 0 &&
    (isLegacyCategory || !!form.grade_component_id) &&
    Number.isFinite(percentWeight) &&
    percentWeight > 0 &&
    percentWeight <= 100

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!valid) return
    try {
      if (isEditing) {
        const patch =
          category.grade_component_id === null
            ? { name: form.name.trim(), weight }
            : {
                name: form.name.trim(),
                grade_component_id: form.grade_component_id,
                grading_period_id: periodId,
                weight,
              }
        await updateCategory.mutateAsync({ id: category.id, patch })
        toast({ title: 'Category updated', tone: 'success' })
      } else {
        await createCategory.mutateAsync({
          classroom_id: classroomId,
          course_subject_id: courseSubjectId,
          component: 'lecture',
          name: form.name.trim(),
          grade_component_id: form.grade_component_id,
          grading_period_id: periodId,
          weight,
        })
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
              {isLegacyCategory ? (
                <p
                  id="category-component"
                  className="flex h-10 items-center rounded-md border border-(--color-border) bg-(--color-surface-2) px-3 text-sm text-(--color-ink-muted)"
                >
                  {category.component === 'lecture' ? 'Lecture' : 'Laboratory'}
                </p>
              ) : (
                <Select
                  value={form.grade_component_id}
                  onValueChange={(value) =>
                    setForm({ ...form, grade_component_id: value })
                  }
                >
                  <SelectTrigger id="category-component">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {components.map((component) => (
                      <SelectItem key={component.id} value={component.id}>
                        {component.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="category-weight">Weight (%)</Label>
              <Input
                id="category-weight"
                type="number"
                min={1}
                max={100}
                step={1}
                required
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })}
              />
            </div>
          </div>
          <p className="text-xs text-(--color-ink-faint)">
            Categories in this period and component must total 100% before a final grade
            is available.
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
