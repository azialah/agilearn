// send-grade-emails — emails each selected student their posted grades for one
// subject + term, from grades.no-reply@agilearn.net via Resend.
//
// Security model:
//   - verify_jwt is on (supabase/config.toml); every query below runs as the
//     caller through their own JWT and the anon key, so RLS decides what they
//     can read. There is no service-role key here.
//   - The request carries ids only. Addresses, grades, CC/BCC and the teacher's
//     name are read from the database.
//   - Mail only goes to the teacher's own school: the student domain and every
//     CC/BCC address must be on the domain of the caller's verified sign-in email
//     (or a subdomain of it), plus any ops-approved GRADE_EMAIL_EXTRA_DOMAINS.
//     Teacher sign-up is already gated by allowed_email_domains, so this keeps
//     the no-reply sender from being pointed at arbitrary inboxes.
//   - At most MAX_PER_HOUR emails per teacher per hour, counted from
//     grade_email_log.
//
// Body: { classroomId, courseSubjectId, term, studentIds: string[], resend?: boolean }
// Returns: { sent: [{studentId, recipient}], skipped: [{studentId, reason}],
//            failed: [{studentId, error}] }

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { gradeEmailHtml, gradeEmailSubject, gradeEmailText } from './template.ts'

const FROM = 'Agilearn Grades <grades.no-reply@agilearn.net>'
const MAX_RECIPIENTS = 200
const MAX_PER_HOUR = 400
const RESEND_BATCH_SIZE = 100
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL_RE = /^[^\s@,;]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

interface RequestBody {
  classroomId: string
  courseSubjectId: string
  term: string
  studentIds: string[]
  resend: boolean
}

function parseBody(raw: unknown): RequestBody | string {
  if (!raw || typeof raw !== 'object') return 'Invalid request body.'
  const body = raw as Record<string, unknown>
  const { classroomId, courseSubjectId, term, studentIds, resend } = body
  if (typeof classroomId !== 'string' || !UUID_RE.test(classroomId))
    return 'classroomId is required.'
  if (typeof courseSubjectId !== 'string' || !UUID_RE.test(courseSubjectId))
    return 'courseSubjectId is required.'
  if (typeof term !== 'string' || !term.trim() || term.length > 40)
    return 'term is required.'
  if (!Array.isArray(studentIds) || studentIds.length === 0)
    return 'Select at least one student.'
  if (studentIds.length > MAX_RECIPIENTS)
    return `Send to at most ${MAX_RECIPIENTS} students at a time.`
  if (!studentIds.every((id) => typeof id === 'string' && UUID_RE.test(id)))
    return 'studentIds must be ids.'
  return {
    classroomId,
    courseSubjectId,
    term: term.trim(),
    studentIds: [...new Set(studentIds as string[])],
    resend: resend === true,
  }
}

function domainOf(address: string): string {
  return address.slice(address.lastIndexOf('@') + 1).toLowerCase()
}

/** The domain itself, or any subdomain of it (students.gordoncollege.edu.ph). */
function withinDomains(domain: string, allowed: readonly string[]): boolean {
  const d = domain.toLowerCase()
  return allowed.some((root) => d === root || d.endsWith(`.${root}`))
}

function cleanCopies(list: string[] | null, allowed: readonly string[]): string[] {
  return (list ?? [])
    .filter(
      (address) => EMAIL_RE.test(address) && withinDomains(domainOf(address), allowed),
    )
    .slice(0, 3)
}

/** Log the detail server-side; give the browser a plain message. */
function dbError(context: string, error: { message: string }): Response {
  console.error(context, error.message)
  return json({ error: 'Could not load the data needed to send grade emails.' }, 500)
}

interface OutgoingEmail {
  studentId: string
  recipient: string
  payload: Record<string, unknown>
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)

  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) return json({ error: 'Email sending is not configured.' }, 500)

  const authorization = req.headers.get('Authorization')
  if (!authorization) return json({ error: 'Sign in to send grade emails.' }, 401)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? '',
    {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  )

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user)
    return json({ error: 'Sign in to send grade emails.' }, 401)
  const userId = userData.user.id
  const userEmail = userData.user.email?.toLowerCase() ?? ''
  if (!EMAIL_RE.test(userEmail))
    return json({ error: 'Your account has no verified email address.' }, 403)
  const allowedDomains = [
    domainOf(userEmail),
    ...(Deno.env.get('GRADE_EMAIL_EXTRA_DOMAINS') ?? '')
      .split(',')
      .map((domain) => domain.trim().toLowerCase())
      .filter(Boolean),
  ]

  const parsed = parseBody(await req.json().catch(() => null))
  if (typeof parsed === 'string') return json({ error: parsed }, 400)
  const { classroomId, courseSubjectId, term, studentIds, resend } = parsed

  // RLS returns the classroom only to its owner (or an admin).
  const { data: classroom, error: classroomError } = await supabase
    .from('classrooms')
    .select('id, owner_id, student_email_domain, grade_email_cc, grade_email_bcc')
    .eq('id', classroomId)
    .maybeSingle()
  if (classroomError) return dbError('classroom', classroomError)
  if (!classroom) return json({ error: 'Classroom not found.' }, 403)
  if (!classroom.student_email_domain)
    return json({ error: 'Set the student email domain before sending.' }, 400)
  if (!withinDomains(classroom.student_email_domain, allowedDomains))
    return json(
      {
        error: `Grade emails can only go to your school's domain (${allowedDomains[0]}) or its subdomains.`,
      },
      403,
    )

  const [subjectResult, ownerResult, studentsResult, gradesResult, logResult] =
    await Promise.all([
      supabase
        .from('course_subjects')
        .select('id, name, subject_code, course_code')
        .eq('id', courseSubjectId)
        .eq('classroom_id', classroomId)
        .maybeSingle(),
      supabase
        .from('profiles')
        .select('full_name')
        .eq('id', classroom.owner_id)
        .maybeSingle(),
      supabase
        .from('students')
        .select('id, first_name, last_name, student_no')
        .eq('classroom_id', classroomId)
        .in('id', studentIds),
      supabase
        .from('posted_grades')
        .select('student_id, lecture, laboratory, term_grade')
        .eq('course_subject_id', courseSubjectId)
        .eq('term', term)
        .in('student_id', studentIds),
      supabase
        .from('grade_email_log')
        .select('student_id')
        .eq('course_subject_id', courseSubjectId)
        .eq('term', term)
        .eq('status', 'sent')
        .in('student_id', studentIds),
    ])
  const firstError =
    subjectResult.error ??
    ownerResult.error ??
    studentsResult.error ??
    gradesResult.error ??
    logResult.error
  if (firstError) return dbError('lookup', firstError)
  const subject = subjectResult.data
  if (!subject) return json({ error: 'Subject not found in this classroom.' }, 404)

  const teacherName = ownerResult.data?.full_name?.trim() || 'Your teacher'
  // The verified sign-in email, not profiles.email (which the teacher can edit).
  const replyTo = userEmail
  const cc = cleanCopies(classroom.grade_email_cc, allowedDomains)
  const bcc = cleanCopies(classroom.grade_email_bcc, allowedDomains)
  const subjectCode = subject.subject_code || subject.course_code || ''

  const studentsById = new Map((studentsResult.data ?? []).map((s) => [s.id, s]))
  const gradesByStudent = new Map((gradesResult.data ?? []).map((g) => [g.student_id, g]))
  const alreadySent = new Set((logResult.data ?? []).map((row) => row.student_id))

  const skipped: { studentId: string; reason: string }[] = []
  const outgoing: OutgoingEmail[] = []
  for (const studentId of studentIds) {
    const student = studentsById.get(studentId)
    const posted = gradesByStudent.get(studentId)
    const studentNo = student?.student_no?.trim() ?? ''
    if (!student) skipped.push({ studentId, reason: 'Not in this classroom' })
    else if (!posted) skipped.push({ studentId, reason: `No ${term} grade posted` })
    else if (!studentNo || /[\s@]/.test(studentNo))
      skipped.push({ studentId, reason: 'No usable SchoolID' })
    else if (!resend && alreadySent.has(studentId))
      skipped.push({ studentId, reason: 'Already sent' })
    else {
      const recipient = `${studentNo}@${classroom.student_email_domain}`
      const content = {
        studentName: `${student.first_name} ${student.last_name}`.trim(),
        subjectName: subject.name,
        subjectCode,
        term,
        lecture: posted.lecture,
        laboratory: posted.laboratory,
        termGrade: posted.term_grade,
        teacherName,
      }
      outgoing.push({
        studentId,
        recipient,
        payload: {
          from: FROM,
          to: [recipient],
          ...(cc.length ? { cc } : {}),
          ...(bcc.length ? { bcc } : {}),
          ...(replyTo ? { reply_to: replyTo } : {}),
          subject: gradeEmailSubject(content),
          text: gradeEmailText(content),
          html: gradeEmailHtml(content),
        },
      })
    }
  }

  if (outgoing.length) {
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count, error: quotaError } = await supabase
      .from('grade_email_log')
      .select('id', { count: 'exact', head: true })
      .eq('sent_by', userId)
      .eq('status', 'sent')
      .gte('created_at', since)
    if (quotaError) return dbError('quota', quotaError)
    if ((count ?? 0) + outgoing.length > MAX_PER_HOUR)
      return json(
        {
          error: `Hourly limit reached (${MAX_PER_HOUR} grade emails per hour). Try again later.`,
        },
        429,
      )
  }

  const sent: { studentId: string; recipient: string }[] = []
  const failed: { studentId: string; error: string }[] = []
  const logRows: Record<string, unknown>[] = []

  for (let i = 0; i < outgoing.length; i += RESEND_BATCH_SIZE) {
    const chunk = outgoing.slice(i, i + RESEND_BATCH_SIZE)
    let ids: (string | null)[] = []
    let chunkError: string | null = null
    try {
      const response = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chunk.map((email) => email.payload)),
      })
      const body = await response.json().catch(() => null)
      if (!response.ok) {
        console.error('resend batch failed', response.status, body?.message)
        chunkError = `The email service rejected the batch (${response.status}).`
      } else {
        const data: unknown[] = Array.isArray(body?.data) ? body.data : []
        ids = chunk.map((_, index) => {
          const item = data[index] as { id?: unknown } | undefined
          return typeof item?.id === 'string' ? item.id : null
        })
      }
    } catch (error) {
      console.error('resend batch error', error)
      chunkError = 'Could not reach the email service.'
    }

    chunk.forEach((email, index) => {
      if (chunkError) failed.push({ studentId: email.studentId, error: chunkError })
      else sent.push({ studentId: email.studentId, recipient: email.recipient })
      logRows.push({
        classroom_id: classroomId,
        course_subject_id: courseSubjectId,
        student_id: email.studentId,
        term,
        recipient: email.recipient,
        status: chunkError ? 'failed' : 'sent',
        error: chunkError,
        resend_id: chunkError ? null : (ids[index] ?? null),
        sent_by: userId,
      })
    })
  }

  if (logRows.length) {
    const { error: logError } = await supabase.from('grade_email_log').insert(logRows)
    // The emails already went out; report the logging problem without
    // pretending the send failed.
    if (logError) console.error('grade_email_log insert failed', logError.message)
  }

  return json({ sent, skipped, failed })
})
