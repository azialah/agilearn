import { useEffect, useRef, useState, type DragEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
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
import { Badge, type BadgeTone } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { TableContainer, Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { useToast } from '@/components/ui/toast'
import { useBulkUpsertAttendance } from '@/lib/queries/attendance'
import { useLocale } from '@/lib/locale'
import { cn } from '@/lib/cn'
import {
  studentFullName,
  type AttendanceRecordInsert,
  type Student,
} from '@/types/domain'
import {
  parseAttendanceImport,
  type AttendanceImportResult,
  type LineOutcome,
} from './participantsImport'

export interface AttendanceImportButtonProps {
  sessionId: string
  classroomId: string
  students: Student[]
}

const SKIP = '__skip__'

const ACCEPT = '.txt'

export function AttendanceImportButton({
  sessionId,
  classroomId,
  students,
}: AttendanceImportButtonProps) {
  const { toast } = useToast()
  const { t } = useLocale()
  const bulkUpsert = useBulkUpsertAttendance(sessionId, classroomId)

  const OUTCOME_META: Record<LineOutcome, { tone: BadgeTone; label: string }> = {
    matched: { tone: 'success', label: t('attendanceImportMatched') },
    ambiguous: { tone: 'warning', label: t('attendanceImportAmbiguous') },
    unmatched: { tone: 'neutral', label: t('attendanceImportUnmatched') },
  }

  const [open, setOpen] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [parsing, setParsing] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [result, setResult] = useState<AttendanceImportResult | null>(null)
  const [selections, setSelections] = useState<Record<number, string>>({})
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!result) return
    const next: Record<number, string> = {}
    result.rows.forEach((row, i) => {
      next[i] = row.matchedStudentId ?? SKIP
    })
    setSelections(next)
  }, [result])

  function reset() {
    setFileName(null)
    setResult(null)
    setParsing(false)
    setDragging(false)
    setSelections({})
    if (inputRef.current) inputRef.current.value = ''
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) reset()
  }

  async function handleFile(file: File) {
    setParsing(true)
    setFileName(file.name)
    setResult(null)
    try {
      const text = await file.text()
      setResult(parseAttendanceImport(text, students))
    } catch (error) {
      toast({
        title: t('attendanceImportReadFileError'),
        description: error instanceof Error ? error.message : undefined,
        tone: 'error',
      })
      reset()
    } finally {
      setParsing(false)
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (file) void handleFile(file)
  }

  const selectedCount = Object.values(selections).filter((v) => v !== SKIP).length

  function handleConfirm() {
    if (!result) return
    const inserts: AttendanceRecordInsert[] = result.rows
      .map((row, i) => ({ studentId: selections[i], remarks: row.remarks }))
      .filter((row) => row.studentId && row.studentId !== SKIP)
      .map((row) => ({
        session_id: sessionId,
        student_id: row.studentId,
        status: 'present' as const,
        remarks: row.remarks,
      }))
    if (inserts.length === 0) return

    bulkUpsert.mutate(inserts, {
      onSuccess: () => {
        toast({
          title: t(
            inserts.length === 1
              ? 'attendanceImportMarkedSingular'
              : 'attendanceImportMarkedPlural',
            { n: inserts.length },
          ),
          tone: 'success',
        })
        handleOpenChange(false)
      },
      onError: (error) =>
        toast({
          title: t('attendanceImportError'),
          description: error instanceof Error ? error.message : undefined,
          tone: 'error',
        }),
    })
  }

  const counts = result?.counts

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          {t('attendanceImportButton')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t('attendanceImportDialogTitle')}</DialogTitle>
          <DialogDescription>
            {t('attendanceImportDescPrefix')}
            <a
              href="https://trackit.visualbrahma.tech/"
              target="_blank"
              rel="noreferrer"
              className="text-(--color-accent-350) underline underline-offset-2"
            >
              {t('attendanceImportTrackItLabel')}
            </a>
            {t('attendanceImportDescSuffix')}
          </DialogDescription>
        </DialogHeader>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleFile(file)
          }}
        />

        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
          }}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg',
            'border border-dashed px-6 py-8 text-center transition-colors',
            dragging
              ? 'border-(--color-accent-400) bg-(--color-accent-500)/10'
              : 'border-(--color-border-strong) hover:bg-(--color-surface-1)',
          )}
        >
          <p className="text-sm text-(--color-ink)">
            {fileName ? (
              <span className="font-medium">{fileName}</span>
            ) : (
              <>
                <span className="font-medium">{t('attendanceImportClickToBrowse')}</span>
                {t('attendanceImportOrDragHere')}
              </>
            )}
          </p>
          <p className="text-xs text-(--color-ink-faint)">.txt</p>
        </div>

        {parsing && (
          <div className="flex items-center gap-2 text-sm text-(--color-ink-muted)">
            <Spinner className="size-4" /> {t('attendanceImportReadingFile')}
          </div>
        )}

        <AnimatePresence>
          {counts && !parsing && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge tone="success">
                  {t('attendanceImportMatchedCount', { n: counts.matched })}
                </Badge>
                <Badge tone="warning">
                  {t('attendanceImportAmbiguousCount', { n: counts.ambiguous })}
                </Badge>
                <Badge tone="neutral">
                  {t('attendanceImportUnmatchedCount', { n: counts.unmatched })}
                </Badge>
              </div>

              {result && result.rows.length > 0 ? (
                <TableContainer className="max-h-72 overflow-y-auto">
                  <Table>
                    <THead className="sticky top-0">
                      <TR>
                        <TH>{t('attendanceImportFromFileColumn')}</TH>
                        <TH>{t('commonStatus')}</TH>
                        <TH className="w-64">{t('attendanceImportAssignToColumn')}</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {result.rows.map((row, i) => (
                        <TR key={`${row.rawName}-${i}`}>
                          <TD>
                            <div className="flex flex-col gap-0.5">
                              <span>{row.rawName}</span>
                              {row.occurrences > 1 && (
                                <span className="text-xs text-(--color-ink-faint)">
                                  {t('attendanceImportEntriesMerged', {
                                    n: row.occurrences,
                                  })}
                                </span>
                              )}
                            </div>
                          </TD>
                          <TD>
                            <Badge tone={OUTCOME_META[row.outcome].tone}>
                              {OUTCOME_META[row.outcome].label}
                            </Badge>
                          </TD>
                          <TD>
                            <Select
                              value={selections[i] ?? SKIP}
                              onValueChange={(value) =>
                                setSelections((s) => ({ ...s, [i]: value }))
                              }
                            >
                              <SelectTrigger
                                aria-label={t('attendanceImportAssignAriaLabel', {
                                  name: row.rawName,
                                })}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={SKIP}>{t('commonSkip')}</SelectItem>
                                {students.map((s) => (
                                  <SelectItem key={s.id} value={s.id}>
                                    {studentFullName(s)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                </TableContainer>
              ) : (
                <p className="text-sm text-(--color-ink-muted)">
                  {t('attendanceImportNoParticipants')}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)}>
            {t('commonCancel')}
          </Button>
          <Button
            onClick={handleConfirm}
            loading={bulkUpsert.isPending}
            disabled={selectedCount === 0 || parsing}
          >
            {selectedCount > 0
              ? t('attendanceImportMarkCount', { n: selectedCount })
              : t('attendanceImportMarkPresent')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
