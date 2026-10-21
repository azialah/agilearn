import { useMemo, useRef, useState, type DragEvent, type ReactNode } from 'react'
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
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/cn'
import { useStudents } from '@/lib/queries/students'
import { useGradebookStructure, useScores } from '@/lib/queries/grades'
import {
  useImportPresets,
  useSaveImportPreset,
  type ImportPreset,
} from '@/lib/queries/gradeSheetConfig'
import type { SheetMapping } from '@/lib/gradeSheetConfig'
import { detectClassRecord, suggestedMapping, type DetectedSheet } from './classRecord'
import { planClassRecordImport, type ImportPlan, type PlanIssue } from './classRecordPlan'
import { applyPreset, bestPreset, presetFromMappings } from './importPresets'
import {
  ClassRecordImportError,
  useCommitClassRecordImport,
  type ImportProgress,
} from './classRecordMutations'
import { readWorkbookSheets } from './readSheet'
import { ColumnMappingTable } from './ColumnMappingTable'
import { UploadIcon } from './icons'

interface Props {
  classroomId: string
  courseSubjectId: string
  trigger: ReactNode
}

type Step = 'upload' | 'map' | 'preview'

const ACCEPT = '.xlsx,.xlsm,.xls,.csv'

export function ClassRecordImportDialog({
  classroomId,
  courseSubjectId,
  trigger,
}: Props) {
  const { toast } = useToast()
  const students = useStudents(classroomId)
  const structure = useGradebookStructure(classroomId, courseSubjectId)
  const activityIds = useMemo(
    () => (structure.data?.activities ?? []).map((a) => a.id),
    [structure.data],
  )
  const scores = useScores(classroomId, activityIds, courseSubjectId)
  const presets = useImportPresets(classroomId)
  const savePreset = useSaveImportPreset()
  const commit = useCommitClassRecordImport()

  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>('upload')
  const [fileName, setFileName] = useState<string | null>(null)
  const [reading, setReading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [sheets, setSheets] = useState<DetectedSheet[]>([])
  const [mappings, setMappings] = useState<Record<string, SheetMapping>>({})
  const [activeSheet, setActiveSheet] = useState<string>('')
  const [appliedPreset, setAppliedPreset] = useState<string | null>(null)
  const [overwrite, setOverwrite] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [savePresetChecked, setSavePresetChecked] = useState(false)
  const [progress, setProgress] = useState<ImportProgress | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const existingPeriods = useMemo(
    () => (structure.data?.periods ?? []).map((period) => period.name),
    [structure.data],
  )

  const plan: ImportPlan | null = useMemo(() => {
    if (step !== 'preview' || !structure.data) return null
    return planClassRecordImport(
      sheets.map((sheet) => ({
        sheet,
        mapping: mappings[sheet.key] ?? suggestedMapping(sheet),
      })),
      {
        students: students.data ?? [],
        structure: structure.data,
        scores: scores.data ?? {},
      },
      { overwriteScores: overwrite },
    )
  }, [step, sheets, mappings, students.data, structure.data, scores.data, overwrite])

  const categoryOptions = useMemo(() => {
    const names = new Set((structure.data?.categories ?? []).map((c) => c.name))
    for (const mapping of Object.values(mappings)) {
      for (const column of Object.values(mapping.columns)) {
        if (column.role === 'activity' && column.category) names.add(column.category)
      }
    }
    return [...names]
  }, [structure.data, mappings])

  const periodOptions = useMemo(() => {
    const names = new Set(existingPeriods)
    for (const mapping of Object.values(mappings))
      if (mapping.period) names.add(mapping.period)
    return [...names]
  }, [existingPeriods, mappings])

  function reset() {
    setStep('upload')
    setFileName(null)
    setReading(false)
    setDragging(false)
    setSheets([])
    setMappings({})
    setActiveSheet('')
    setAppliedPreset(null)
    setOverwrite(false)
    setPresetName('')
    setSavePresetChecked(false)
    setProgress(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  function handleOpenChange(next: boolean) {
    if (commit.isPending) return
    setOpen(next)
    if (!next) reset()
  }

  function choosePreset(preset: ImportPreset | null) {
    if (!preset) {
      setMappings(Object.fromEntries(sheets.map((s) => [s.key, suggestedMapping(s)])))
      setAppliedPreset(null)
      return
    }
    setMappings(applyPreset(sheets, preset.mapping))
    setAppliedPreset(preset.name)
    setPresetName(preset.name)
  }

  async function handleFile(file: File) {
    setReading(true)
    setFileName(file.name)
    try {
      const matrices = await readWorkbookSheets(file)
      const detected = detectClassRecord(matrices, { defaultPeriod: existingPeriods[0] })
      if (!detected.some((sheet) => sheet.rows.length > 0)) {
        throw new Error(
          'No sheet has a learner-name column with learners under it. Check the file has a header like "Learner\'s Names" or "Last Name".',
        )
      }
      const match = bestPreset(detected, presets.data ?? [])
      setSheets(detected)
      setMappings(
        match
          ? applyPreset(detected, match.mapping)
          : Object.fromEntries(detected.map((s) => [s.key, suggestedMapping(s)])),
      )
      setAppliedPreset(match?.name ?? null)
      setPresetName(match?.name ?? file.name.replace(/\.[^.]+$/, ''))
      setActiveSheet((detected.find((sheet) => sheet.include) ?? detected[0]).key)
      setStep('map')
    } catch (error) {
      toast({
        title: 'Could not read file',
        description: error instanceof Error ? error.message : undefined,
        tone: 'error',
      })
      reset()
    } finally {
      setReading(false)
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (file) void handleFile(file)
  }

  async function handleImport() {
    if (!plan || plan.blocked) return
    setProgress(null)
    try {
      const written = await commit.mutateAsync({
        classroomId,
        courseSubjectId,
        plan,
        onProgress: setProgress,
      })
      if (savePresetChecked && presetName.trim()) {
        try {
          await savePreset.mutateAsync({
            classroomId,
            name: presetName,
            mapping: presetFromMappings(sheets, mappings),
          })
        } catch (error) {
          toast({
            title: 'Imported, but the preset was not saved',
            description: error instanceof Error ? error.message : undefined,
            tone: 'error',
          })
        }
      }
      toast({
        title: 'Class record imported',
        description: summarize(written),
        tone: 'success',
      })
      setOpen(false)
      reset()
    } catch (error) {
      toast({
        title: 'Import stopped',
        description:
          error instanceof ClassRecordImportError
            ? `${error.message} Already saved: ${summarize(error.written) || 'nothing'}. Importing the same file again picks up where this stopped.`
            : error instanceof Error
              ? error.message
              : undefined,
        tone: 'error',
      })
    }
  }

  const sheet = sheets.find((s) => s.key === activeSheet)
  const sheetMapping = sheet ? (mappings[sheet.key] ?? suggestedMapping(sheet)) : null
  const includedCount = sheets.filter((s) => mappings[s.key]?.include).length
  const loadingExisting = structure.isLoading || students.isLoading || scores.isLoading

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import class record</DialogTitle>
          <DialogDescription>
            {step === 'upload' &&
              'Upload any class-record workbook. Learners, grading periods, categories, activities and scores are read from it; computed columns (totals, PS, WS, grades) are ignored and recalculated here.'}
            {step === 'map' &&
              'Check how each column will be imported. Change anything that was read wrong — nothing is saved until you confirm on the next step.'}
            {step === 'preview' && 'Review exactly what will be added to this subject.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              aria-label="Class record file"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void handleFile(file)
              }}
            />
            <div
              role="button"
              tabIndex={0}
              aria-label="Choose a class record file"
              onClick={() => inputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click()
              }}
              onDragOver={(event) => {
                event.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg',
                'border border-dashed px-6 py-10 text-center transition-colors',
                dragging
                  ? 'border-(--color-accent-400) bg-(--color-accent-500)/10'
                  : 'border-(--color-border-strong) hover:bg-(--color-surface-1)',
              )}
            >
              {reading ? (
                <Spinner className="size-6" />
              ) : (
                <UploadIcon className="size-6 text-(--color-ink-muted)" />
              )}
              <p className="text-sm text-(--color-ink)">
                {fileName ? (
                  <span className="font-medium">{fileName}</span>
                ) : (
                  <>
                    <span className="font-medium">Click to browse</span> or drag a file
                    here
                  </>
                )}
              </p>
              <p className="text-xs text-(--color-ink-faint)">
                .xlsx, .xlsm, .xls or .csv · one sheet per grading period works best
              </p>
            </div>
            {loadingExisting && (
              <p className="flex items-center gap-2 text-xs text-(--color-ink-faint)">
                <Spinner className="size-3" /> Loading this subject’s gradebook…
              </p>
            )}
          </>
        )}

        {step === 'map' && sheet && sheetMapping && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-(--color-ink-muted)">
                <span className="font-medium text-(--color-ink)">{fileName}</span> ·{' '}
                {includedCount} of {sheets.length} sheet{sheets.length === 1 ? '' : 's'}{' '}
                included
              </p>
              {(presets.data?.length ?? 0) > 0 && (
                <div className="flex items-center gap-2">
                  <label htmlFor="cr-preset" className="text-xs text-(--color-ink-faint)">
                    Mapping preset
                  </label>
                  <select
                    id="cr-preset"
                    aria-label="Mapping preset"
                    value={appliedPreset ?? ''}
                    onChange={(event) =>
                      choosePreset(
                        presets.data?.find((p) => p.name === event.target.value) ?? null,
                      )
                    }
                    className="h-8 rounded-md border border-(--color-border) bg-(--color-surface-1) px-2 text-base md:text-sm"
                  >
                    <option value="">Detected automatically</option>
                    {presets.data?.map((preset) => (
                      <option key={preset.id} value={preset.name}>
                        {preset.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {appliedPreset && (
              <p className="text-xs text-(--color-success)">
                Matched your saved preset “{appliedPreset}”.
              </p>
            )}

            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Sheets">
              {sheets.map((item) => {
                const mapping = mappings[item.key]
                const selected = item.key === activeSheet
                return (
                  <div
                    key={item.key}
                    className={cn(
                      'flex items-center gap-2 rounded-full border px-3 py-1 text-xs',
                      selected
                        ? 'border-(--color-accent-400) bg-(--color-accent-500)/10'
                        : 'border-(--color-border)',
                    )}
                  >
                    <input
                      type="checkbox"
                      aria-label={`Include sheet ${item.name}`}
                      checked={!!mapping?.include}
                      disabled={item.rows.length === 0}
                      onChange={(event) =>
                        setMappings((current) => ({
                          ...current,
                          [item.key]: {
                            ...(current[item.key] ?? suggestedMapping(item)),
                            include: event.target.checked,
                          },
                        }))
                      }
                      className="size-3.5 accent-(--color-accent-400) disabled:opacity-40"
                    />
                    <button
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      onClick={() => setActiveSheet(item.key)}
                      className="font-medium"
                      title={item.reason}
                    >
                      {item.name}
                    </button>
                    {item.rows.length === 0 && (
                      <span className="text-(--color-ink-faint)">· skipped</span>
                    )}
                  </div>
                )
              })}
            </div>

            {sheet.rows.length === 0 ? (
              <p className="rounded-md bg-(--color-surface-1) p-4 text-sm text-(--color-ink-muted)">
                {sheet.reason ?? 'Nothing to import on this sheet.'}
              </p>
            ) : (
              <>
                {!sheetMapping.include && (
                  <p className="text-xs text-(--color-ink-faint)">
                    This sheet is not included{sheet.reason ? ` (${sheet.reason})` : ''}.
                    Tick it above to import it.
                  </p>
                )}
                <ColumnMappingTable
                  sheet={sheet}
                  mapping={sheetMapping}
                  onChange={(next) =>
                    setMappings((current) => ({ ...current, [sheet.key]: next }))
                  }
                  periodOptions={periodOptions}
                  categoryOptions={categoryOptions}
                />
              </>
            )}
          </div>
        )}

        {step === 'preview' && plan && (
          <PlanPreview
            plan={plan}
            overwrite={overwrite}
            onOverwriteChange={setOverwrite}
            savePreset={savePresetChecked}
            onSavePresetChange={setSavePresetChecked}
            presetName={presetName}
            onPresetNameChange={setPresetName}
            progress={commit.isPending ? progress : null}
          />
        )}

        <DialogFooter>
          {step === 'upload' && (
            <Button variant="ghost" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
          )}
          {step === 'map' && (
            <>
              <Button variant="ghost" onClick={reset}>
                Choose another file
              </Button>
              <Button
                onClick={() => setStep('preview')}
                disabled={includedCount === 0 || loadingExisting}
              >
                Review import
              </Button>
            </>
          )}
          {step === 'preview' && (
            <>
              <Button
                variant="ghost"
                onClick={() => setStep('map')}
                disabled={commit.isPending}
              >
                Back to mapping
              </Button>
              <Button
                onClick={() => void handleImport()}
                loading={commit.isPending}
                disabled={!plan || plan.blocked}
              >
                Import
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function summarize(progress: ImportProgress): string {
  const parts: string[] = []
  const add = (n: number, one: string, many: string) => {
    if (n > 0) parts.push(`${n} ${n === 1 ? one : many}`)
  }
  add(progress.students, 'student', 'students')
  add(progress.periods, 'period', 'periods')
  add(progress.categories, 'category', 'categories')
  add(progress.activities, 'activity', 'activities')
  add(progress.scores, 'score', 'scores')
  return parts.join(', ')
}

interface PreviewProps {
  plan: ImportPlan
  overwrite: boolean
  onOverwriteChange: (value: boolean) => void
  savePreset: boolean
  onSavePresetChange: (value: boolean) => void
  presetName: string
  onPresetNameChange: (value: string) => void
  progress: ImportProgress | null
}

function PlanPreview({
  plan,
  overwrite,
  onOverwriteChange,
  savePreset,
  onSavePresetChange,
  presetName,
  onPresetNameChange,
  progress,
}: PreviewProps) {
  const errors = plan.issues.filter((issue) => issue.level === 'error')
  const warnings = plan.issues.filter((issue) => issue.level === 'warning')
  const existingScoresTouched = plan.counts.keptExisting + plan.counts.overwrites

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="New students"
          value={plan.students.create.length}
          hint={`${plan.students.matched} matched`}
        />
        <Stat
          label="New structure"
          value={
            plan.periods.length + plan.categories.length + plan.activities.create.length
          }
          hint={`${plan.periods.length} periods · ${plan.categories.length} categories · ${plan.activities.create.length} activities`}
        />
        <Stat
          label="Scores to save"
          value={plan.scores.length}
          hint={`${plan.counts.newScores} new · ${plan.counts.overwrites} replaced`}
        />
        <Stat
          label="Skipped scores"
          value={plan.counts.invalid + plan.counts.keptExisting}
          hint={`${plan.counts.unchanged} already identical`}
        />
      </div>

      {plan.periods.length + plan.categories.length + plan.activities.create.length >
        0 && (
        <div className="space-y-2 rounded-md bg-(--color-surface-1) p-4 text-sm">
          {plan.periods.length > 0 && (
            <PreviewLine label="Periods" items={plan.periods.map((p) => p.name)} />
          )}
          {plan.categories.length > 0 && (
            <PreviewLine
              label="Categories"
              items={plan.categories.map(
                (c) => `${c.name} (${Math.round(c.weight * 100)}%)`,
              )}
            />
          )}
          {plan.activities.create.length > 0 && (
            <PreviewLine
              label="Activities"
              items={plan.activities.create.map((a) => `${a.name} /${a.maxScore}`)}
            />
          )}
        </div>
      )}

      {existingScoresTouched > 0 && (
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={overwrite}
            onChange={(event) => onOverwriteChange(event.target.checked)}
            className="mt-0.5 size-4 accent-(--color-accent-400)"
          />
          <span>
            Replace existing scores that differ from the file
            <span className="block text-xs text-(--color-ink-faint)">
              {existingScoresTouched} score{existingScoresTouched === 1 ? '' : 's'}{' '}
              already in Agilearn differ from the file. Blank cells never erase a score.
            </span>
          </span>
        </label>
      )}

      {(errors.length > 0 || warnings.length > 0) && (
        <div className="space-y-2">
          <div className="flex gap-2 text-xs">
            {errors.length > 0 && <Badge tone="danger">{errors.length} to fix</Badge>}
            {warnings.length > 0 && <Badge tone="warning">{warnings.length} notes</Badge>}
          </div>
          <ul className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-(--color-border) p-3 text-xs">
            {[...errors, ...warnings].map((issue, index) => (
              <li key={index} className="flex gap-2">
                <span
                  className={cn(
                    'shrink-0 font-medium',
                    issue.level === 'error'
                      ? 'text-(--color-danger)'
                      : 'text-(--color-warning)',
                  )}
                >
                  {issue.level === 'error' ? 'Fix' : 'Note'}
                </span>
                <span className="text-(--color-ink-muted)">
                  {where(issue)}
                  {issue.message}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {plan.blocked && errors.length > 0 && (
        <p className="text-sm text-(--color-danger)">
          Fix the items marked “Fix” (or set those columns to Ignore) to continue.
        </p>
      )}

      {plan.blocked && errors.length === 0 && (
        <p className="text-sm text-(--color-ink-muted)">
          Nothing new to import — everything in this file is already in Agilearn.
        </p>
      )}

      <div className="space-y-2 border-t border-(--color-border) pt-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={savePreset}
            onChange={(event) => onSavePresetChange(event.target.checked)}
            className="size-4 accent-(--color-accent-400)"
          />
          Save this mapping as a preset for next time
        </label>
        {savePreset && (
          <Input
            aria-label="Preset name"
            value={presetName}
            onChange={(event) => onPresetNameChange(event.target.value)}
            placeholder="e.g. DepEd E-Class Record"
            className="max-w-sm"
          />
        )}
      </div>

      {progress && (
        <p className="flex items-center gap-2 text-xs text-(--color-ink-faint)">
          <Spinner className="size-3" /> Saved so far:{' '}
          {summarize(progress) || 'starting…'}
        </p>
      )}
    </div>
  )
}

function where(issue: PlanIssue): string {
  const parts = [
    issue.sheet,
    issue.rowNumber ? `row ${issue.rowNumber}` : undefined,
    issue.column,
  ].filter(Boolean)
  return parts.length > 0 ? `${parts.join(' · ')} — ` : ''
}

function Stat({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="rounded-md border border-(--color-border) bg-(--color-surface-1) p-3">
      <p className="text-xs text-(--color-ink-faint)">{label}</p>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
      <p className="text-[11px] text-(--color-ink-faint)">{hint}</p>
    </div>
  )
}

function PreviewLine({ label, items }: { label: string; items: string[] }) {
  return (
    <p>
      <span className="font-medium">{label}: </span>
      <span className="text-(--color-ink-muted)">{items.join(', ')}</span>
    </p>
  )
}
