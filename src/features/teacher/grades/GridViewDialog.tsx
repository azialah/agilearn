import { useState } from 'react'
import { ArrowDown, ArrowUp, Columns3 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/toast'
import { useLocale, type MessageKey } from '@/lib/locale'
import {
  DEFAULT_GRID_VIEW,
  orderByIds,
  type GridViewConfig,
} from '@/lib/gradeSheetConfig'
import { useSaveGradeSheetConfig } from '@/lib/queries/gradeSheetConfig'
import type { GradeComponentRecord } from '@/types/domain'

interface Props {
  classroomId: string
  courseSubjectId?: string
  components: GradeComponentRecord[]
  view: GridViewConfig
}

type Toggle = Extract<
  keyof GridViewConfig,
  | 'showCategoryPercent'
  | 'showPeriodGrade'
  | 'showComponentSummary'
  | 'showFinal'
  | 'showStudentNo'
>

const TOGGLES: { key: Toggle; label: MessageKey }[] = [
  { key: 'showCategoryPercent', label: 'gradesViewCategoryPercent' },
  { key: 'showPeriodGrade', label: 'gradesViewPeriodGrade' },
  { key: 'showComponentSummary', label: 'gradesViewComponentSummary' },
  { key: 'showFinal', label: 'gradesViewFinal' },
  { key: 'showStudentNo', label: 'gradesViewStudentNo' },
]

/** Saves on every change, optimistically, so the grid updates underneath. */
export function GridViewDialog({
  classroomId,
  courseSubjectId,
  components,
  view,
}: Props) {
  const { t } = useLocale()
  const { toast } = useToast()
  const save = useSaveGradeSheetConfig()
  const [open, setOpen] = useState(false)
  const ordered = orderByIds(components, view.componentOrder)

  function apply(next: GridViewConfig) {
    if (!courseSubjectId) return
    save.mutate(
      { classroomId, courseSubjectId, gridView: next },
      {
        onError: (error) =>
          toast({
            title: t('gradesViewSaveErrorToast'),
            description: error instanceof Error ? error.message : undefined,
            tone: 'error',
          }),
      },
    )
  }

  function move(index: number, delta: number) {
    const ids = ordered.map((component) => component.id)
    const target = index + delta
    if (target < 0 || target >= ids.length) return
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    apply({ ...view, componentOrder: ids })
  }

  function toggleComponent(id: string, visible: boolean) {
    const hidden = new Set(view.hiddenComponentIds)
    if (visible) hidden.delete(id)
    else hidden.add(id)
    apply({ ...view, hiddenComponentIds: [...hidden] })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full border border-(--color-border) bg-(--color-surface-1) px-3 py-1.5 text-xs font-medium text-(--color-ink-muted) transition-colors hover:bg-(--color-surface-2) hover:text-(--color-ink)"
        >
          <Columns3 className="size-3.5" aria-hidden />
          {t('gradesViewButton')}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('gradesViewDialogTitle')}</DialogTitle>
          <DialogDescription>{t('gradesViewDialogDescription')}</DialogDescription>
        </DialogHeader>

        {!courseSubjectId && (
          <p className="mb-3 text-xs text-(--color-ink-faint)">
            {t('gradesViewLocalOnly')}
          </p>
        )}

        <div className="space-y-4">
          <fieldset className="space-y-2" disabled={!courseSubjectId}>
            {TOGGLES.map((toggle) => (
              <label key={toggle.key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={view[toggle.key]}
                  onChange={(event) =>
                    apply({ ...view, [toggle.key]: event.target.checked })
                  }
                  className="size-4 accent-(--color-accent-400)"
                />
                {t(toggle.label)}
              </label>
            ))}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={view.density === 'compact'}
                onChange={(event) =>
                  apply({
                    ...view,
                    density: event.target.checked ? 'compact' : 'comfortable',
                  })
                }
                className="size-4 accent-(--color-accent-400)"
              />
              {t('gradesViewDensity')}
            </label>
          </fieldset>

          {ordered.length > 1 && (
            <fieldset className="space-y-2" disabled={!courseSubjectId}>
              <legend className="mb-1 text-xs font-medium uppercase tracking-wide text-(--color-ink-faint)">
                {t('gradesViewComponentsHeading')}
              </legend>
              <ul className="divide-y divide-(--color-border) rounded-md border border-(--color-border)">
                {ordered.map((component, index) => (
                  <li key={component.id} className="flex items-center gap-2 px-3 py-1.5">
                    <input
                      type="checkbox"
                      aria-label={t('gradesViewShowComponent', {
                        component: component.name,
                      })}
                      checked={!view.hiddenComponentIds.includes(component.id)}
                      onChange={(event) =>
                        toggleComponent(component.id, event.target.checked)
                      }
                      className="size-4 accent-(--color-accent-400)"
                    />
                    <span className="flex-1 text-sm">{component.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={t('gradesViewMoveUp', { component: component.name })}
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUp className="size-3.5" aria-hidden />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={t('gradesViewMoveDown', { component: component.name })}
                      disabled={index === ordered.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDown className="size-3.5" aria-hidden />
                    </Button>
                  </li>
                ))}
              </ul>
            </fieldset>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => apply(DEFAULT_GRID_VIEW)}
            disabled={!courseSubjectId}
          >
            {t('gradesViewReset')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
