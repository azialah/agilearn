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
import { findWeightIssues, type ReportingConfig } from '@/lib/grading'
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
  /**
   * The subject on screen. Omitted from the classroom header, where no subject
   * is selected and a whole-classroom sheet is the right thing; supplied from
   * the grades page, where exporting Lecture + Laboratory fused into one sheet
   * was simply wrong. It also keeps the score cache subject-scoped, so Lecture
   * scores stop clobbering Laboratory's entry.
   */
  courseSubjectId?: string
  /**
   * Which number the Final column should hold. Supplied by the grades page,
   * which already knows the subject's template and resolved table. Without it
   * the sheet prints the raw percentage while the screen shows the converted
   * grade — same student, two different numbers.
   */
  reporting?: ReportingConfig
}

export function ExportMenu({
  classroomId,
  courseSubjectId,
  reporting = {},
}: ExportMenuProps) {
  const { toast } = useToast()
  const [busy, setBusy] = useState<ExportKind | null>(null)

  const classroom = useClassroom(classroomId)
  const students = useStudents(classroomId)
  const structure = useGradebookStructure(classroomId, courseSubjectId)
  const activityIds = useMemo(
    () => (structure.data?.activities ?? []).map((a) => a.id),
    [structure.data],
  )
  const scores = useScores(classroomId, activityIds, courseSubjectId)

  // A wrong number on screen is recoverable; a wrong FAILED on a PDF that
  // leaves the building is not. The grades page warns about weights that miss
  // 100%, but nothing here does, so refuse rather than export a grade the
  // teacher did not actually configure.
  const weightIssues = structure.data ? findWeightIssues(structure.data) : []

  async function run(kind: ExportKind, task: () => Promise<void>) {
    if (busy) return
    if (weightIssues.length > 0) {
      toast({
        title: 'Fix the grade weights first',
        description:
          'One or more levels do not total 100%. Open Structure to correct them, then export.',
        tone: 'error',
      })
      return
    }
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
        reporting,
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
        reporting,
      )
      downloadPdf(bytes, buildFilename(room.course_code, 'grade-report'))
      toast({ title: 'Grade report exported', tone: 'success' })
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={!!busy || !structure.isSuccess}>
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
