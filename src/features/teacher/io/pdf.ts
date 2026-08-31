/**
 * Client-side grade report (PDF) built with pdf-lib. Mirrors the legacy
 * pdf.blade.php content: a classroom header, a bordered student table with
 * lecture / laboratory / final grades, and a generated-on date footer.
 */

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import {
  computeConfiguredStudentGradebook,
  computeReportedFinalGrade,
  isConfiguredGradeComplete,
  remarkFor,
  round2,
  type GradebookStructure,
  type ReportingConfig,
  type ScoreMap,
} from '@/lib/grading'
import { studentFullName, type Classroom, type Student } from '@/types/domain'

const PAGE = { width: 792, height: 612 } // US Letter, landscape
const MARGIN = 48
const INK = rgb(0.07, 0.09, 0.12)
const MUTED = rgb(0.4, 0.45, 0.52)
const LINE = rgb(0.8, 0.83, 0.87)
const HEAD_BG = rgb(0.95, 0.96, 0.98)

interface Column {
  label: string
  width: number
  align: 'left' | 'center'
}

function fmt(value: number | null): string {
  return value === null ? '—' : round2(value).toFixed(2)
}

function truncate(text: string, font: PDFFont, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text
  let out = text
  while (out.length > 1 && font.widthOfTextAtSize(`${out}…`, size) > maxWidth) {
    out = out.slice(0, -1)
  }
  return `${out}…`
}

/** Build the grade report PDF and return its bytes. */
export async function buildGradeReportPdf(
  classroom: Classroom,
  students: Student[],
  structure: GradebookStructure,
  scores: ScoreMap,
  /** Same contract as the workbook exporter: omitted means raw percentage. */
  reporting: ReportingConfig = {},
): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)

  const rows = students.map((student) => {
    const book = computeConfiguredStudentGradebook(structure, scores, student.id)
    return {
      no: student.student_no,
      name: studentFullName(student),
      final: fmt(computeReportedFinalGrade(structure, scores, student.id, reporting)),
      remark: remarkFor(
        book.final,
        isConfiguredGradeComplete(structure, scores, student.id),
      ),
    }
  })

  const tableWidth = PAGE.width - MARGIN * 2
  const columns: Column[] = [
    { label: 'Student No', width: tableWidth * 0.16, align: 'left' },
    { label: 'Name', width: tableWidth * 0.5, align: 'left' },
    { label: 'Final', width: tableWidth * 0.16, align: 'center' },
    { label: 'Remarks', width: tableWidth * 0.18, align: 'center' },
  ]

  const rowHeight = 22
  const headerSize = 9
  const bodySize = 10
  const generatedOn = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  let page = doc.addPage([PAGE.width, PAGE.height])
  let y = 0

  const drawText = (
    p: PDFPage,
    text: string,
    x: number,
    baseline: number,
    size: number,
    f: PDFFont,
    color = INK,
  ) => p.drawText(text, { x, y: baseline, size, font: f, color })

  const drawCells = (
    p: PDFPage,
    values: string[],
    top: number,
    f: PDFFont,
    size: number,
  ) => {
    let x = MARGIN
    const baseline = top - rowHeight + 7
    for (let i = 0; i < columns.length; i++) {
      const col = columns[i]
      const pad = 8
      const text = truncate(values[i] ?? '', f, size, col.width - pad * 2)
      const textWidth = f.widthOfTextAtSize(text, size)
      const tx = col.align === 'center' ? x + (col.width - textWidth) / 2 : x + pad
      drawText(p, text, tx, baseline, size, f)
      x += col.width
    }
  }

  const drawRowBorders = (p: PDFPage, top: number) => {
    p.drawLine({
      start: { x: MARGIN, y: top - rowHeight },
      end: { x: MARGIN + tableWidth, y: top - rowHeight },
      thickness: 0.5,
      color: LINE,
    })
  }

  const drawTableHeader = (p: PDFPage, top: number) => {
    p.drawRectangle({
      x: MARGIN,
      y: top - rowHeight,
      width: tableWidth,
      height: rowHeight,
      color: HEAD_BG,
    })
    drawCells(
      p,
      columns.map((c) => c.label),
      top,
      bold,
      headerSize,
    )
    p.drawLine({
      start: { x: MARGIN, y: top },
      end: { x: MARGIN + tableWidth, y: top },
      thickness: 0.75,
      color: LINE,
    })
    drawRowBorders(p, top)
    return top - rowHeight
  }

  const drawPageHeader = (p: PDFPage): number => {
    let top = PAGE.height - MARGIN
    drawText(p, classroom.course_name, MARGIN, top - 18, 18, bold)
    top -= 30
    drawText(
      p,
      `${classroom.course_code}  |  Year ${classroom.year}  |  Block ${classroom.block}`,
      MARGIN,
      top - 12,
      11,
      font,
      MUTED,
    )
    top -= 34
    return top
  }

  const drawFooter = (p: PDFPage, pageNo: number, pageCount: number) => {
    const label = `Generated ${generatedOn}`
    drawText(p, label, MARGIN, MARGIN - 18, 8, font, MUTED)
    const right = `Page ${pageNo} of ${pageCount}`
    const rw = font.widthOfTextAtSize(right, 8)
    drawText(p, right, PAGE.width - MARGIN - rw, MARGIN - 18, 8, font, MUTED)
  }

  // First pass: lay out rows across pages to know the page count for footers.
  const pages: PDFPage[] = [page]
  y = drawTableHeader(page, drawPageHeader(page))

  if (rows.length === 0) {
    drawText(page, 'No students in this classroom.', MARGIN, y - 16, 10, font, MUTED)
    y -= rowHeight
  }

  for (const row of rows) {
    if (y - rowHeight < MARGIN + 8) {
      page = doc.addPage([PAGE.width, PAGE.height])
      pages.push(page)
      y = drawTableHeader(page, drawPageHeader(page))
    }
    drawCells(page, [row.no, row.name, row.final], y, font, bodySize)
    drawRowBorders(page, y)
    y -= rowHeight
  }

  pages.forEach((p, index) => drawFooter(p, index + 1, pages.length))

  return doc.save()
}

/** Trigger a browser download for raw PDF bytes. */
export function downloadPdf(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
