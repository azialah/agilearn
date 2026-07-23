import { useRef, useState, type DragEvent } from 'react'
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
import { useToast } from '@/components/ui/toast'
import { useStudents } from '@/lib/queries/students'
import { cn } from '@/lib/cn'
import { parseRosterRows, type RosterParseResult, type RowStatus } from './parsing'
import { readSheetMatrix } from './readSheet'
import { useImportStudents } from './mutations'
import { UploadIcon } from './icons'

export interface ImportButtonProps {
  classroomId: string
}

const STATUS_META: Record<RowStatus, { tone: BadgeTone; label: string }> = {
  new: { tone: 'success', label: 'New' },
  duplicate: { tone: 'warning', label: 'Duplicate' },
  invalid: { tone: 'danger', label: 'Invalid' },
}

const ACCEPT = '.xlsx,.xls'

export function ImportButton({ classroomId }: ImportButtonProps) {
  const { toast } = useToast()
  const students = useStudents(classroomId)
  const importStudents = useImportStudents(classroomId)

  const [open, setOpen] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [parsing, setParsing] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [result, setResult] = useState<RosterParseResult | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const newRows = result?.rows.filter((r) => r.status === 'new') ?? []

  function reset() {
    setFileName(null)
    setResult(null)
    setParsing(false)
    setDragging(false)
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
      const matrix = await readSheetMatrix(file)
      const existing = (students.data ?? []).map((s) => s.student_no)
      setResult(parseRosterRows(matrix, existing))
    } catch (error) {
      toast({
        title: 'Could not read file',
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

  async function handleConfirm() {
    if (newRows.length === 0) return
    try {
      const summary = await importStudents.mutateAsync(newRows)
      if (summary.failed.length === 0) {
        toast({
          title: `Imported ${summary.inserted} student${summary.inserted === 1 ? '' : 's'}`,
          tone: 'success',
        })
      } else {
        toast({
          title: `Imported ${summary.inserted}, ${summary.failed.length} failed`,
          description: `Row ${summary.failed[0].rowNumber}: ${summary.failed[0].message}`,
          tone: summary.inserted > 0 ? 'default' : 'error',
        })
      }
      if (summary.inserted > 0) handleOpenChange(false)
    } catch (error) {
      toast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : undefined,
        tone: 'error',
      })
    }
  }

  const counts = result?.counts

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UploadIcon />
          Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import students</DialogTitle>
          <DialogDescription>
            Upload an .xlsx or .xls roster. Columns: student no, last name, first name,
            middle initial. Header and example rows are skipped automatically.
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
          <UploadIcon className="size-6 text-(--color-ink-muted)" />
          <p className="text-sm text-(--color-ink)">
            {fileName ? (
              <span className="font-medium">{fileName}</span>
            ) : (
              <>
                <span className="font-medium">Click to browse</span> or drag a file here
              </>
            )}
          </p>
          <p className="text-xs text-(--color-ink-faint)">.xlsx or .xls</p>
        </div>

        {parsing && (
          <div className="flex items-center gap-2 text-sm text-(--color-ink-muted)">
            <Spinner className="size-4" /> Reading file…
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
                <Badge tone="success">{counts.new} new</Badge>
                <Badge tone="warning">{counts.duplicate} duplicate</Badge>
                <Badge tone="danger">{counts.invalid} invalid</Badge>
                {counts.skipped > 0 && (
                  <Badge tone="neutral">{counts.skipped} example skipped</Badge>
                )}
              </div>

              {result && result.rows.length > 0 ? (
                <TableContainer className="max-h-72 overflow-y-auto">
                  <Table>
                    <THead className="sticky top-0">
                      <TR>
                        <TH className="w-12">Row</TH>
                        <TH>Student No</TH>
                        <TH>Name</TH>
                        <TH>Status</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {result.rows.map((row) => (
                        <TR key={`${row.rowNumber}-${row.studentNo}`}>
                          <TD className="text-(--color-ink-faint)">
                            {row.rowNumber}
                          </TD>
                          <TD>{row.studentNo || '—'}</TD>
                          <TD>
                            {[row.lastName, row.firstName].filter(Boolean).join(', ') ||
                              '—'}
                            {row.middleInitial ? ` ${row.middleInitial}.` : ''}
                          </TD>
                          <TD>
                            <div className="flex flex-col gap-0.5">
                              <Badge tone={STATUS_META[row.status].tone}>
                                {STATUS_META[row.status].label}
                              </Badge>
                              {row.reason && (
                                <span className="text-xs text-(--color-ink-faint)">
                                  {row.reason}
                                </span>
                              )}
                            </div>
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                </TableContainer>
              ) : (
                <p className="text-sm text-(--color-ink-muted)">
                  No importable rows were found in this file.
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleConfirm()}
            loading={importStudents.isPending}
            disabled={newRows.length === 0 || parsing}
          >
            {newRows.length > 0
              ? `Import ${newRows.length} student${newRows.length === 1 ? '' : 's'}`
              : 'Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
