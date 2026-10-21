/**
 * Pure helpers for grade emails: the student address rule, CC/BCC parsing and
 * the message template shown in the send dialog's preview.
 *
 * The send-grade-emails Edge Function renders the real message with its own
 * copy of this template (supabase/functions/send-grade-emails/template.ts) —
 * keep the two in step.
 */

const DOMAIN_RE = /^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/
const EMAIL_RE = /^[^\s@,;]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i

export const MAX_COPY_RECIPIENTS = 3

/** "@GordonCollege.edu.ph " → "gordoncollege.edu.ph"; invalid → null. */
export function normalizeEmailDomain(input: string): string | null {
  const domain = input.trim().toLowerCase().replace(/^@+/, '')
  return DOMAIN_RE.test(domain) ? domain : null
}

/** student_no + domain → "202110190@gordoncollege.edu.ph"; null if either is missing. */
export function studentAddress(
  studentNo: string | null | undefined,
  domain: string | null | undefined,
): string | null {
  const local = (studentNo ?? '').trim()
  if (!local || !domain || /[\s@]/.test(local)) return null
  return `${local}@${domain}`
}

export interface AddressListResult {
  addresses: string[]
  invalid: string[]
  tooMany: boolean
}

/** Comma/semicolon/space-separated list → unique, lowercased addresses. */
export function parseAddressList(input: string): AddressListResult {
  const parts = input
    .split(/[\s,;]+/)
    .map((part) => part.trim())
    .filter(Boolean)
  const addresses: string[] = []
  const invalid: string[] = []
  for (const part of parts) {
    if (!EMAIL_RE.test(part)) invalid.push(part)
    else if (!addresses.includes(part.toLowerCase())) addresses.push(part.toLowerCase())
  }
  return { addresses, invalid, tooMany: addresses.length > MAX_COPY_RECIPIENTS }
}

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
  return value === null ? '—' : value.toFixed(2)
}

export function gradeEmailSubject(
  content: Pick<GradeEmailContent, 'term' | 'subjectName'>,
) {
  return `Your ${content.term} grade — ${content.subjectName}`
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
