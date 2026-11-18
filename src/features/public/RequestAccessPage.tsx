import { useState, type FormEvent } from 'react'
import { Link } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { allowedDomainsQuery } from '@/lib/queries/profiles'
import { useSubmitDomainRequest } from '@/lib/queries/domainRequests'
import { MarketingShell, NextPage, PageHero } from './MarketingShell'
import { DOMAIN_RE, emailDomain } from './site'
import { usePageMeta } from './usePageMeta'

/** Accepts a bare domain ("school.edu.ph") or a full email ("you@school.edu.ph"). */
export function toDomain(input: string): string | null {
  const v = input.trim().toLowerCase()
  if (v.includes('@')) return emailDomain(v)
  return DOMAIN_RE.test(v) ? v : null
}

/**
 * Request access for a school whose email domain isn't approved yet. Sends
 * submit_domain_request, which lands in the admins' domain-requests queue.
 */
export function RequestAccessPage({ domain: initialDomain = '' }: { domain?: string }) {
  usePageMeta(
    'Request access for your school | Agilearn',
    'Sign-up is limited to approved school email domains. Send your school’s domain and the Agilearn team will review it.',
    '/request-access',
  )
  const queryClient = useQueryClient()
  const submit = useSubmitDomainRequest()
  const [name, setName] = useState('')
  const [school, setSchool] = useState('')
  const [domain, setDomain] = useState(initialDomain)
  const [message, setMessage] = useState('')
  const [note, setNote] = useState('')
  const [approved, setApproved] = useState(false)
  const [sent, setSent] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setApproved(false)
    const clean = toDomain(domain)
    if (!name.trim() || !school.trim() || !clean) {
      setNote(
        clean
          ? 'Add your name and school so the Agilearn team can follow up.'
          : 'Enter your school’s email domain, like gordoncollege.edu.ph.',
      )
      return
    }
    try {
      const allowed = await queryClient.ensureQueryData(allowedDomainsQuery)
      if (allowed.includes(clean)) {
        setApproved(true)
        setNote(`${clean} is already approved.`)
        return
      }
    } catch {
      // Can't check right now: submit anyway; admins see duplicates.
    }
    submit.mutate(
      {
        name: name.trim(),
        school: school.trim(),
        domain: clean,
        message: message.trim(),
      },
      {
        onSuccess: () => {
          setSent(clean)
          setNote('')
        },
        onError: (err) => setNote(err.message || 'That didn’t go through. Try again.'),
      },
    )
  }

  return (
    <MarketingShell variant="page">
      <PageHero
        crumb="Request access"
        kicker="For schools not listed yet"
        title={
          <>
            Request access for <span className="it">your school.</span>
          </>
        }
        lead="Sign-up is limited to approved school email domains. Send your school’s domain and the Agilearn team will review it. Once it’s approved, every teacher with that school email can sign up."
      />
      <section className="pg-sec">
        <div className="c-wrap">
          {sent ? (
            <div className="c-req c-req-done" role="status">
              <b>Request sent for {sent}.</b>
              <span>You can sign up once the Agilearn team approves it.</span>
              <Link to="/" className="c-btn ghost">
                Back to home
              </Link>
            </div>
          ) : (
            <form className="c-req" onSubmit={onSubmit} noValidate>
              <label>
                <span>Your name</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  placeholder="Juan dela Cruz"
                  required
                />
              </label>
              <label>
                <span>School</span>
                <input
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  autoComplete="organization"
                  placeholder="Gordon College"
                  required
                />
              </label>
              <label className="wide">
                <span>School email domain</span>
                <input
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  inputMode="url"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="gordoncollege.edu.ph"
                  required
                  aria-describedby="req-note"
                />
              </label>
              <label className="wide">
                <span>Message (optional)</span>
                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Anything the Agilearn team should know?"
                />
              </label>
              <button type="submit" className="c-btn amber" disabled={submit.isPending}>
                {submit.isPending ? 'Sending…' : 'Send request'}
              </button>
              <span id="req-note" className="note wide" role="status">
                {note}{' '}
                {approved && (
                  <Link to="/teacher/signup">
                    Start as a teacher with your school email.
                  </Link>
                )}
              </span>
            </form>
          )}
        </div>
      </section>
      <NextPage to="/faq" label="FAQ" />
    </MarketingShell>
  )
}
