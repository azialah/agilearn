import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import { useToast } from '@/components/ui/toast'
import { useClassroom } from '@/lib/queries/classrooms'
import { useStudents } from '@/lib/queries/students'
import { useGradebookStructure, useScores } from '@/lib/queries/grades'
import { buildFilename, type ExportKind } from './parsing'
import {
  buildGradeSheetWorkbook,
  buildRosterTemplateWorkbook,
  downloadWorkbook,
} from './workbook'
import { buildGradeReportPdf, downloadPdf } from './pdf'
import { ChevronDownIcon, DownloadIcon, PdfIcon, SheetIcon } from './icons'

export interface ExportMenuProps {
  classroomId: string
}

export function ExportMenu({ classroomId }: ExportMenuProps) {
  const { toast } = useToast()
  const [busy, setBusy] = useState<ExportKind | null>(null)

  const classroom = useClassroom(classroomId)
  const students = useStudents(classroomId)
  const structure = useGradebookStructure(classroomId)
  const activityIds = useMemo(
    () => (structure.data?.activities ?? []).map((a) => a.id),
    [structure.data],
  )
  const scores = useScores(classroomId, activityIds)

  async function run(kind: ExportKind, task: () => Promise<void>) {
    if (busy) return
    setBusy(kind)
    try {
      await task()
    } catch (error) {
      toast({
        title: 'Export failed',
        description: error instanceof Error ? error.message : undefined,
        tone: 'error',
      })
    } finally {
      setBusy(null)
    }
  }

  function requireData() {
    if (!classroom.data) throw new Error('Classroom is still loading')
    return classroom.data
  }

  function exportTemplate() {
    return run('roster-template', async () => {
      const code = classroom.data?.course_code
      downloadWorkbook(
        buildRosterTemplateWorkbook(),
        buildFilename(code, 'roster-template'),
      )
      toast({ title: 'Roster template downloaded', tone: 'success' })
    })
  }

  function exportGradeSheet() {
    return run('grade-sheet', async () => {
      const room = requireData()
      const wb = buildGradeSheetWorkbook(
        room,
        students.data ?? [],
        structure.data ?? { periods: [], components: [], categories: [], activities: [] },
        scores.data ?? {},
      )
      downloadWorkbook(wb, buildFilename(room.course_code, 'grade-sheet'))
      toast({ title: 'Grade sheet exported', tone: 'success' })
    })
  }

  function exportReport() {
    return run('grade-report', async () => {
      const room = requireData()
      const bytes = await buildGradeReportPdf(
        room,
        students.data ?? [],
        structure.data ?? { periods: [], components: [], categories: [], activities: [] },
        scores.data ?? {},
      )
      downloadPdf(bytes, buildFilename(room.course_code, 'grade-report'))
      toast({ title: 'Grade report exported', tone: 'success' })
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={!!busy}>
          {busy ? <Spinner className="size-4" /> : <DownloadIcon />}
          Export
          <ChevronDownIcon className="size-3.5 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuLabel>Download</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => void exportTemplate()}>
          <SheetIcon />
          Roster template (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => void exportGradeSheet()}
          disabled={!classroom.data}
        >
          <SheetIcon />
          Grade sheet (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void exportReport()} disabled={!classroom.data}>
          <PdfIcon />
          Grade report (.pdf)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
