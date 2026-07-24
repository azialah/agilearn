import { AlertTriangle, ArrowRight, FileText, ShieldCheck } from 'lucide-react'
import { PublicPageShell } from './PublicPageShell'

function DraftNotice() {
  return (
    <aside
      className="mx-auto max-w-3xl rounded-2xl border border-(--color-warning)/35 bg-(--color-warning)/10 p-5"
      aria-label="Draft legal notice"
    >
      <div className="flex gap-3">
        <AlertTriangle
          className="mt-0.5 size-5 shrink-0 text-(--color-warning)"
          aria-hidden="true"
        />
        <div>
          <h2 className="font-semibold">Draft for legal review</h2>
          <p className="mt-1 text-sm leading-6 text-(--color-ink-muted)">
            This public draft describes the current product at a high level. It is not the
            final Privacy Notice or Terms of Use and must be reviewed by Philippine
            privacy counsel before public launch.
          </p>
        </div>
      </div>
    </aside>
  )
}

function ReturnToSignup({ returnTo }: { returnTo?: string }) {
  if (!returnTo) return null
  return (
    <aside className="sticky bottom-4 z-20 mx-auto mt-8 flex max-w-3xl flex-col gap-3 rounded-2xl border border-(--color-accent-200) bg-(--color-surface-1)/95 p-4 shadow-(--shadow-pop) backdrop-blur sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold">Continue signing up?</p>
        <p className="mt-0.5 text-sm text-(--color-ink-muted)">
          Your account setup step is still waiting for you.
        </p>
      </div>
      <a
        href={returnTo}
        className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-full bg-(--color-accent-400) px-4 text-sm font-medium text-(--color-accent-fg) transition-colors hover:bg-(--color-accent-500) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent-400) focus-visible:ring-offset-2"
      >
        Return to account creation <ArrowRight className="size-4" aria-hidden="true" />
      </a>
    </aside>
  )
}

function LegalContent({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-3xl px-6">{children}</div>
}

function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-(--color-border) py-7 last:border-b-0">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-(--color-ink-muted)">
        {children}
      </div>
    </section>
  )
}

function FinalizationChecklist() {
  return (
    <section className="mt-8 rounded-2xl border border-dashed border-(--color-border-strong) bg-(--color-surface-2) p-6">
      <h2 className="text-lg font-semibold">Required before final publication</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-(--color-ink-muted)">
        <li>Legal entity name, business address, and privacy/support contact.</li>
        <li>
          Whether a Data Protection Officer is appointed and how requests are handled.
        </li>
        <li>
          Hosting location, retention/deletion schedule, and applicable subprocessors.
        </li>
        <li>
          Whether schools or individual teachers contract with Agilearn, plus pricing and
          dispute terms.
        </li>
        <li>
          How minors, guardian contacts, sensitive information, and school instructions
          are handled.
        </li>
      </ul>
    </section>
  )
}

export function PrivacyPage({ returnTo }: { returnTo?: string }) {
  return (
    <PublicPageShell
      eyebrow="Draft legal notice"
      title="Privacy Notice"
      description="Last updated July 24, 2026. This draft is written in plain language and awaits fact-specific legal review."
    >
      <LegalContent>
        <DraftNotice />
        <article className="mt-8 rounded-3xl border border-(--color-border) bg-(--color-surface-1) p-6 shadow-(--shadow-card) sm:p-9">
          <div className="flex items-center gap-3 text-(--color-accent-350)">
            <ShieldCheck className="size-6" aria-hidden="true" />
            <span className="font-mono text-xs font-semibold uppercase tracking-[0.18em]">
              Privacy at a glance
            </span>
          </div>
          <LegalSection title="What Agilearn is">
            <p>
              Agilearn is a school-management workspace for teachers and administrators.
              It supports classrooms, rosters, weighted gradebooks, attendance records,
              and teaching modules.
            </p>
          </LegalSection>
          <LegalSection title="Information used in the workspace">
            <p>
              The product is designed to use account information, classroom and roster
              information, grade and attendance records, and teaching materials that an
              authorized user chooses to enter or upload.
            </p>
            <p>
              This draft does not set a final policy for minors, guardian contacts, or
              sensitive personal information. Those uses must be confirmed with counsel
              and the applicable school before final publication.
            </p>
          </LegalSection>
          <LegalSection title="Why information is used">
            <p>
              Information is used to authenticate users, provide the classroom and
              teaching features they request, keep the workspace secure, and maintain the
              service. The final notice must state the precise lawful bases, recipients,
              and retention periods that apply.
            </p>
          </LegalSection>
          <LegalSection title="Access and safeguards">
            <p>
              Agilearn uses role-aware access controls so teachers work with their own
              classrooms and administrators have additional management tools. Private
              teaching materials are kept in private storage. No security control is a
              guarantee, and the final notice must describe the adopted safeguards
              accurately.
            </p>
          </LegalSection>
          <LegalSection title="Your privacy choices and requests">
            <p>
              A final notice will identify the data controller or processor, the privacy
              contact or Data Protection Officer, and how a person may request access,
              correction, deletion, portability, or raise a concern. Those contacts are
              not yet published in this draft.
            </p>
          </LegalSection>
          <LegalSection title="Philippine privacy framework">
            <p>
              This draft is being prepared with the Philippine Data Privacy Act of 2012
              and National Privacy Commission guidance in mind. It is not a substitute for
              the final, fact-specific notice required for the organization that operates
              Agilearn.
            </p>
          </LegalSection>
        </article>
        <FinalizationChecklist />
        <ReturnToSignup returnTo={returnTo} />
      </LegalContent>
    </PublicPageShell>
  )
}

export function TermsPage({ returnTo }: { returnTo?: string }) {
  return (
    <PublicPageShell
      eyebrow="Draft legal notice"
      title="Terms of Use"
      description="Last updated July 24, 2026. This draft sets expectations for the service and awaits legal review before publication."
    >
      <LegalContent>
        <DraftNotice />
        <article className="mt-8 rounded-3xl border border-(--color-border) bg-(--color-surface-1) p-6 shadow-(--shadow-card) sm:p-9">
          <div className="flex items-center gap-3 text-(--color-accent-350)">
            <FileText className="size-6" aria-hidden="true" />
            <span className="font-mono text-xs font-semibold uppercase tracking-[0.18em]">
              Using Agilearn
            </span>
          </div>
          <LegalSection title="The service">
            <p>
              Agilearn provides a workspace for authorized teachers and administrators to
              organize classrooms, rosters, grades, attendance, and teaching materials.
              Product features may change as the service develops.
            </p>
          </LegalSection>
          <LegalSection title="Accounts and approved access">
            <p>
              Teacher self-signup is limited to approved school email domains.
              Administrators are provisioned separately. Users must keep account
              credentials secure and use the service only with authority from their school
              or organization.
            </p>
          </LegalSection>
          <LegalSection title="Responsible use">
            <p>
              Users are responsible for the information they enter, their authority to
              handle it, and the accuracy of records they maintain. Do not use the service
              to violate applicable law, school policy, privacy rights, or
              intellectual-property rights.
            </p>
          </LegalSection>
          <LegalSection title="Service data and materials">
            <p>
              Users retain responsibility for the teaching materials and classroom records
              they upload or create. The final Terms must define ownership, permissions,
              retention, deletion, and any applicable school agreement.
            </p>
          </LegalSection>
          <LegalSection title="Availability and changes">
            <p>
              Agilearn is an evolving software service. The final Terms will state support
              expectations, any service limitations, suspension rights, payment terms if
              applicable, and notice of material changes.
            </p>
          </LegalSection>
          <LegalSection title="Governing terms">
            <p>
              The service operator, governing law, dispute venue, pricing model, and
              contact details have not yet been finalized. They must be completed and
              reviewed before these Terms are presented as binding.
            </p>
          </LegalSection>
        </article>
        <FinalizationChecklist />
        <ReturnToSignup returnTo={returnTo} />
      </LegalContent>
    </PublicPageShell>
  )
}
