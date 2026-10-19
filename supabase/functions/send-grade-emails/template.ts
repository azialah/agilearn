// Grade email template. Mirrors src/features/teacher/posted-grades/gradeEmail.ts,
// which renders the preview in the send dialog — keep the two in step.

export interface GradeEmailContent {
  studentName: string
  subjectName: string
  subjectCode: string
  term: string
  lecture: number | null
  laboratory: number | null
  termGrade: number | null
  teacherName: string
}

function grade(value: number | null): string {
  return value === null ? '—' : Number(value).toFixed(2)
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function gradeEmailSubject(
  content: Pick<GradeEmailContent, 'term' | 'subjectName'>,
) {
  // Header value: no line breaks, bounded length.
  return `Your ${content.term} grade — ${content.subjectName}`
    .replace(/[\r\n]+/g, ' ')
    .slice(0, 150)
}

export function gradeEmailText(content: GradeEmailContent): string {
  const subject = [content.subjectName, content.subjectCode].filter(Boolean).join(' ')
  return [
    `Hi ${content.studentName},`,
    '',
    `This is your grade breakdown for ${subject}:`,
    `Lecture - ${grade(content.lecture)}`,
    `Laboratory - ${grade(content.laboratory)}`,
    '',
    `${content.term} Grade - ${grade(content.termGrade)}`,
    '',
    'Any questions? Send me an email at our communication platforms.',
    '',
    'Thanks,',
    content.teacherName,
  ].join('\n')
}

export function gradeEmailHtml(content: GradeEmailContent): string {
  const e = escapeHtml
  const subject = [content.subjectName, content.subjectCode].filter(Boolean).join(' ')
  const row = (label: string, value: string, strong = false) =>
    `<tr><td style="padding:4px 16px 4px 0;color:#555">${e(label)}</td>` +
    `<td style="padding:4px 0;font-variant-numeric:tabular-nums;${strong ? 'font-weight:700' : ''}">${e(value)}</td></tr>`
  return `<!doctype html>
<html><body style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#111">
<p>Hi ${e(content.studentName)},</p>
<p>This is your grade breakdown for <strong>${e(subject)}</strong>:</p>
<table role="presentation" style="border-collapse:collapse">
${row('Lecture', grade(content.lecture))}
${row('Laboratory', grade(content.laboratory))}
${row(`${content.term} Grade`, grade(content.termGrade), true)}
</table>
<p style="color:#555;font-size:13px">Actual Lecture × 40% + Actual Laboratory × 60% = ${e(content.term)} Grade</p>
<p>Any questions? Send me an email at our communication platforms.</p>
<p>Thanks,<br>${e(content.teacherName)}</p>
</body></html>`
}
