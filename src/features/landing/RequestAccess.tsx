import { useState, type FormEvent } from 'react'
import { motion, useReducedMotion, type Variants } from 'motion/react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { useToast } from '@/components/ui/toast'

// Public contact fallback (safe in the client bundle).
const CONTACT_EMAIL = 'johnneomanuel@gmail.com'
// Bare domain: labels of letters/digits/hyphens separated by dots, no '@'.
const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i

export function RequestAccess() {
  const reduce = useReducedMotion()
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [school, setSchool] = useState('')
  const [domain, setDomain] = useState('')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : 0.08 } },
  }
  const item: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  }

  /** Validation and submission failures surface as a toast, not inline text. */
  function notifyError(message: string) {
    toast({ title: message, tone: 'error' })
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const cleanDomain = domain.trim().toLowerCase()
    if (!name.trim() || !school.trim() || !cleanDomain) {
      notifyError('Please fill in your name, school, and domain.')
      return
    }
    if (!DOMAIN_RE.test(cleanDomain)) {
      notifyError('Enter a bare domain like gordoncollege.edu.ph (no @, no name).')
      return
    }

    setSubmitting(true)
    const { error: rpcError } = await supabase.rpc('submit_domain_request', {
      p_name: name.trim(),
      p_school: school.trim(),
      p_domain: cleanDomain,
      p_message: message.trim() || undefined,
    })
    setSubmitting(false)
    if (rpcError) {
      notifyError(rpcError.message)
      return
    }
    setSent(true)
    setName('')
    setSchool('')
    setDomain('')
    setMessage('')
  }

  return (
    <section id="request-access" className="mx-auto max-w-4xl scroll-mt-24 px-6 py-20">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="overflow-hidden rounded-(--radius-xl) border border-(--color-border) bg-(--color-surface-1) p-6 sm:p-10"
      >
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-(--color-accent-350)">
            Getting started
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Is your school not listed yet?
          </h2>
          <p className="mt-3 text-base text-(--color-ink-muted)">
            Sign-up is limited to approved school email domains. Send us your
            school&apos;s domain and we&apos;ll get it set up.
          </p>
        </div>

        <motion.form
          onSubmit={handleSubmit}
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="mx-auto mt-8 grid max-w-xl gap-4 sm:grid-cols-2"
        >
          <motion.div variants={item} className="space-y-1.5">
            <Label htmlFor="ra-name">Full name</Label>
            <Input
              id="ra-name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Juan dela Cruz"
            />
          </motion.div>
          <motion.div variants={item} className="space-y-1.5">
            <Label htmlFor="ra-school">School</Label>
            <Input
              id="ra-school"
              autoComplete="organization"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              placeholder="Gordon College"
            />
          </motion.div>
          <motion.div variants={item} className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="ra-domain">School email domain</Label>
            <Input
              id="ra-domain"
              inputMode="url"
              autoCapitalize="none"
              spellCheck={false}
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="gordoncollege.edu.ph"
            />
          </motion.div>
          <motion.div variants={item} className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="ra-message">Message (optional)</Label>
            <textarea
              id="ra-message"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Anything else we should know?"
              className="w-full rounded-md border border-(--color-border) bg-(--color-surface-1) px-3 py-2 text-base md:text-sm text-(--color-ink) placeholder:text-(--color-ink-faint) transition-colors focus-visible:border-(--color-accent-400) focus-visible:outline-none"
            />
          </motion.div>

          {/* Errors are toasts; the success confirmation stays inline because
              the form clears itself and a transient toast would be the only
              trace that anything was submitted. */}
          {sent && (
            <p className="rounded-md border border-(--color-success)/40 bg-(--color-success)/10 px-3 py-2 text-sm text-(--color-success) sm:col-span-2">
              Thanks! Your request has been sent. We&apos;ll review it and enable your
              school&apos;s domain soon.
            </p>
          )}

          <motion.div variants={item} className="sm:col-span-2">
            <Button type="submit" size="lg" className="w-full" loading={submitting}>
              Send request
            </Button>
            <p className="mt-3 text-center text-xs text-(--color-ink-faint)">
              Prefer email? Reach us at{' '}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-(--color-accent-350) hover:text-(--color-accent-300)"
              >
                {CONTACT_EMAIL}
              </a>
            </p>
          </motion.div>
        </motion.form>
      </motion.div>
    </section>
  )
}
