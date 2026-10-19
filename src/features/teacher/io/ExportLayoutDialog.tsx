import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/cn'
import type { GradebookStructure, ReportingConfig } from '@/lib/grading'
import {
  DEFAULT_EXPORT_LAYOUT,
  DETAILED_EXPORT_LAYOUT,
  exportColumnMeta,
  sanitizeSheetName,
  type ExportLayout,
} from '@/lib/gradeSheetConfig'
import { useSaveGradeSheetConfig } from '@/lib/queries/gradeSheetConfig'
import { previewHeaders, type LecLabBooks } from './exportLayout'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  classroomId: string
  courseSubjectId: string
  layout: ExportLayout
  structure: GradebookStructure
  reporting: ReportingConfig
  /** Lecture + Laboratory subjects, so the preview shows LEC / LAB columns. */
  pair?: LecLabBooks
}

export function ExportLayoutDialog({
  open,
  onOpenChange,
  classroomId,
  courseSubjectId,
  layout,
  structure,
  reporting,
  pair,
}: Props) {
  const { toast } = useToast()
  const save = useSaveGradeSheetConfig()
  const [draft, setDraft] = useState<ExportLayout>(layout)

  useEffect(() => {
    if (open) setDraft(layout)
  }, [open, layout])

  const headers = useMemo(
    () => previewHeaders(structure, reporting, draft, pair),
    [structure, reporting, draft, pair],
  )

  function move(index: number, delta: number) {
    setDraft((current) => {
      const columns = [...current.columns]
      const target = index + delta
      if (target < 0 || target >= columns.length) return current
      ;[columns[index], columns[target]] = [columns[target], columns[index]]
      return { ...current, columns }
    })
  }

  function update(index: number, patch: Partial<ExportLayout['columns'][number]>) {
    setDraft((current) => ({
      ...current,
      columns: current.columns.map((column, i) =>
        i === index ? { ...column, ...patch } : column,
      ),
    }))
  }

  async function handleSave() {
    try {
      await save.mutateAsync({
        classroomId,
        courseSubjectId,
        exportLayout: { ...draft, sheetName: sanitizeSheetName(draft.sheetName) },
      })
      toast({ title: 'Export layout saved', tone: 'success' })
      onOpenChange(false)
    } catch (error) {
      toast({
        title: 'Could not save the export layout',
        description: error instanceof Error ? error.message : undefined,
        tone: 'error',
      })
    }
  }

  const enabledCount = draft.columns.filter((column) => column.enabled).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Grade sheet layout</DialogTitle>
          <DialogDescription>
            Choose which columns the .xlsx export carries, their order and their headers.
            Saved for this subject.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="export-sheet-name" className="text-sm font-medium">
              Sheet name
            </label>
            <Input
              id="export-sheet-name"
              value={draft.sheetName}
              maxLength={31}
              onChange={(event) => setDraft({ ...draft, sheetName: event.target.value })}
            />
          </div>

          <ul className="divide-y divide-(--color-border) rounded-md border border-(--color-border)">
            {draft.columns.map((column, index) => {
              const meta = exportColumnMeta(column.key)
              return (
                <li
                  key={column.key}
                  className={cn(
                    'flex flex-wrap items-center gap-3 px-3 py-2',
                    !column.enabled && 'opacity-60',
                  )}
                >
                  <input
                    type="checkbox"
                    aria-label={`Include ${meta.title}`}
                    checked={column.enabled}
                    onChange={(event) => update(index, { enabled: event.target.checked })}
                    className="size-4 accent-(--color-accent-400)"
                  />
                  <div className="min-w-40 flex-1">
                    <p className="text-sm font-medium">{meta.title}</p>
                    <p className="text-xs text-(--color-ink-faint)">{meta.description}</p>
                  </div>
                  {!meta.group && (
                    <Input
                      aria-label={`Header for ${meta.title}`}
                      value={column.label}
                      placeholder={
                        column.key === 'finalGrade'
                          ? 'Built-in header'
                          : meta.defaultLabel
                      }
                      onChange={(event) => update(index, { label: event.target.value })}
                      className="h-8 w-40"
                      disabled={!column.enabled}
                    />
                  )}
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Move ${meta.title} up`}
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUp className="size-3.5" aria-hidden />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Move ${meta.title} down`}
                      disabled={index === draft.columns.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDown className="size-3.5" aria-hidden />
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>

          <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wide text-(--color-ink-faint)">
              Preview · {headers.length} column{headers.length === 1 ? '' : 's'}
            </p>
            <div className="scrollbar-thin flex gap-1 overflow-x-auto rounded-md bg-(--color-surface-1) p-2">
              {headers.length === 0 ? (
                <span className="text-xs text-(--color-ink-faint)">
                  No columns selected
                </span>
              ) : (
                headers.map((header, index) => (
                  <span
                    key={`${header}-${index}`}
                    className="shrink-0 rounded border border-(--color-border) bg-(--color-surface-2) px-2 py-1 text-xs"
                  >
                    {header}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setDraft(DEFAULT_EXPORT_LAYOUT)}>
            Class record format
          </Button>
          <Button variant="ghost" onClick={() => setDraft(DETAILED_EXPORT_LAYOUT)}>
            Detailed sheet
          </Button>
          <Button
            onClick={() => void handleSave()}
            loading={save.isPending}
            disabled={enabledCount === 0}
          >
            Save layout
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
