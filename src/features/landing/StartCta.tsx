import { useState, type FormEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useMagnetic } from '@/features/public/fx'
import { emailDomain } from '@/features/public/site'
import { allowedDomainsQuery } from '@/lib/queries/profiles'
import { useSubmitDomainRequest } from '@/lib/queries/domainRequests'
import { useOnboardingStore } from '@/features/teacher/onboarding/onboardingStore'

const IDLE_NOTE = 'We’ll take you to sign-up with this email filled in.'

/**
 * Final CTA. A school email on an approved domain goes straight to sign-up with
 * the email filled in; any other domain opens a short request-access form
 * (submit_domain_request) that lands in the admins' domain-requests queue.
 */
export function StartCta() {
  const magnetic = useMagnetic()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const setOnboardingEmail = useOnboardingStore((s) => s.setEmail)
  const submitRequest = useSubmitDomainRequest()

  const [email, setEmail] = useState('')
  const [note, setNote] = useState(IDLE_NOTE)
  const [checking, setChecking] = useState(false)
  const [requestFor, setRequestFor] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [school, setSchool] = useState('')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)

  async function onEmail(e: FormEvent) {
    e.preventDefault()
    const domain = emailDomain(email)
    if (!domain) {
      setNote('Enter your full school email, like you@gordoncollege.edu.ph.')
      return
    }
    setChecking(true)
    let allowed: string[] | null = null
    try {
      allowed = await queryClient.ensureQueryData(allowedDomainsQuery)
    } catch {
      // Can't check right now (offline?): sign-up re-checks the domain itself.
    }
    setChecking(false)
    if (allowed && !allowed.includes(domain)) {
      setRequestFor(domain)
      setNote(`${domain} isn’t approved yet. Request access for your school below.`)
      return
    }
    setOnboardingEmail(email.trim().toLowerCase())
    void navigate({ to: '/teacher/signup' })
  }

  function onRequest(e: FormEvent) {
    e.preventDefault()
    if (!requestFor) return
    if (!name.trim() || !school.trim()) {
      setNote('Add your name and school so the Agilearn team can follow up.')
      return
    }
    submitRequest.mutate(
      {
        name: name.trim(),
        school: school.trim(),
        domain: requestFor,
        message: message.trim(),
      },
      {
        onSuccess: () => {
          setSent(true)
          setNote(
            `Request sent for ${requestFor}. You can sign up once the Agilearn team approves it.`,
          )
        },
        onError: (err) => setNote(err.message || 'That didn’t go through. Try again.'),
      },
    )
  }

  return (
    <section className="c-cta" id="get-started" aria-label="Get started">
      <div className="c-wrap">
        <div className="c-cta-card">
          <div className="c-slot" aria-hidden="true">
            {/* Decorative. Phones get the portrait shot (subject on top, copy over
                its white bottom); wider cards keep copy on the wide shot's calm left. */}
            <picture>
              <source
                media="(max-width: 719px)"
                srcSet="/images/cta-classroom-portrait.webp"
                width={1024}
                height={1536}
              />
              <img
                src="/images/cta-classroom.webp"
                alt=""
                width={1920}
                height={819}
                loading="lazy"
                decoding="async"
              />
            </picture>
          </div>
          <span className="eyebrow">Get started</span>
          <h2>
            Start your next grading <span className="it">period.</span>
          </h2>
          <form className="c-cta-form" onSubmit={onEmail} noValidate>
            <div className="c-cta-row">
              <input
                type="email"
                name="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (requestFor) {
                    setRequestFor(null)
                    setSent(false)
                    setNote(IDLE_NOTE)
                  }
                }}
                placeholder="you@yourschool.edu.ph"
                aria-label="School email"
                aria-describedby="cta-note"
                autoComplete="email"
                inputMode="email"
                autoCapitalize="none"
                spellCheck={false}
              />
              <button
                type="submit"
                className="c-btn amber c-mag"
                disabled={checking}
                {...magnetic}
              >
                {checking ? 'Checking…' : 'Continue'}
              </button>
            </div>
            <span id="cta-note" className="note" role="status">
              {note}
            </span>
          </form>
          {requestFor && !sent && (
            <form
              className="c-req"
              onSubmit={onRequest}
              aria-label="Request access for your school"
            >
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
                <span>Message (optional)</span>
                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Anything the Agilearn team should know?"
                />
              </label>
              <button type="submit" className="c-btn" disabled={submitRequest.isPending}>
                {submitRequest.isPending
                  ? 'Sending…'
                  : `Request access for ${requestFor}`}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
