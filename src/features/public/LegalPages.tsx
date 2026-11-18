import { ArrowRight } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { MarketingShell, PageHero } from './MarketingShell'
import { JumpLink, useSectionSpy } from './SectionNav'
import { usePageMeta } from './usePageMeta'

/* Privacy Notice (RA 10173, Data Privacy Act of 2012) and Terms of Use.
   Both stay "Draft for legal review"; amber [placeholders] mark the details the
   operator still has to supply before launch. */

const TOC_PRIVACY = [
  ['p-short', 'The short version'],
  ['p-who', 'Who we are'],
  ['p-role', 'Our role'],
  ['p-collect', 'What we collect'],
  ['p-why', 'Why we use it'],
  ['p-minors', 'Students and minors'],
  ['p-share', 'Who can see it'],
  ['p-protect', 'How we protect it'],
  ['p-keep', 'How long we keep it'],
  ['p-rights', 'Your rights'],
  ['p-breach', 'Breaches'],
  ['p-storage', 'Browser storage'],
  ['p-changes', 'Changes and contact'],
] as const
const IDS_PRIVACY = TOC_PRIVACY.map(([id]) => id)

const TOC_TERMS = [
  ['t-short', 'The short version'],
  ['t-agree', 'Agreeing to these terms'],
  ['t-who', 'Who can use Agilearn'],
  ['t-account', 'Your account'],
  ['t-records', 'Your class records'],
  ['t-grades', 'Grades are your decision'],
  ['t-use', 'Acceptable use'],
  ['t-avail', 'Availability and changes'],
  ['t-suspend', 'Suspension and closing'],
  ['t-ip', 'Intellectual property'],
  ['t-liab', 'Liability'],
  ['t-law', 'Governing law'],
  ['t-contact', 'Changes and contact'],
] as const
const IDS_TERMS = TOC_TERMS.map(([id]) => id)

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

export function PrivacyPage({ returnTo }: { returnTo?: string }) {
  usePageMeta(
    'Privacy Notice (Draft) | Agilearn',
    'How Agilearn collects, uses and protects personal information under the Data Privacy Act of 2012 (RA 10173). Draft pending legal review.',
    '/privacy',
  )
  const active = useSectionSpy(IDS_PRIVACY)
  return (
    <MarketingShell variant="page">
      <PageHero
        crumb="Privacy Notice"
        kicker="Republic Act No. 10173"
        title={
          <>
            Privacy <span className="it">Notice.</span>
          </>
        }
        lead="How Agilearn collects, uses and protects personal information, written to follow the Data Privacy Act of 2012, its Implementing Rules and Regulations, and National Privacy Commission guidance."
      >
        <div className="pg-meta">
          <span>
            Effective <span className="ph">[date]</span>
          </span>
          <span className="draft">Draft for legal review</span>
          <span>Applies to teachers, admins and student records</span>
        </div>
      </PageHero>

      <section className="pg-sec lg-sec">
        <div className="c-wrap lg-wrap">
          <nav className="lg-toc" aria-label="On this page">
            <b>On this page</b>
            <ol>
              {TOC_PRIVACY.map(([id, label]) => (
                <li key={id}>
                  <JumpLink id={id} active={active}>
                    {label}
                  </JumpLink>
                </li>
              ))}
            </ol>
          </nav>
          <article className="lg-doc">
            <section className="lg-sum" id="p-short">
              <h2>The short version</h2>
              <ul>
                <li>
                  Your class records stay private. Only the teacher who owns a class, and
                  Agilearn's admins, can open them.
                </li>
                <li>
                  Grades and attendance are education records, which the law treats as
                  sensitive personal information, so access is tightly limited.
                </li>
                <li>
                  We never sell personal information and never use it for advertising.
                </li>
                <li>
                  You can ask to see, correct, download or delete your information, and
                  you can complain to the National Privacy Commission.
                </li>
              </ul>
            </section>

            <section id="p-who">
              <h2>
                <span className="n">01</span>Who we are
              </h2>
              <p>
                Agilearn is operated by{' '}
                <span className="ph">[legal name of operator]</span>,{' '}
                <span className="ph">[business address]</span> ("Agilearn", "we", "us").
              </p>
              <p>
                Our Data Protection Officer is <span className="ph">[DPO name]</span>. You
                can reach them at <span className="ph">[dpo email]</span> about anything
                in this notice.
              </p>
            </section>

            <section id="p-role">
              <h2>
                <span className="n">02</span>Our role
              </h2>
              <p>
                For <b>teacher and admin accounts</b>, we decide how that information is
                used, so we are its personal information controller.
              </p>
              <p>
                For <b>class records</b> that teachers enter about students, the school or
                teacher decides why that information is processed. Agilearn processes it
                on their behalf as a personal information processor, following their
                instructions and this notice. The school or teacher is responsible for
                having a lawful basis under Sections 12 and 13 of RA 10173.
              </p>
            </section>

            <section id="p-collect">
              <h2>
                <span className="n">03</span>What we collect
              </h2>
              <ul>
                <li>
                  <b>Account information:</b> your name, school email, school and teaching
                  levels from sign-up. Passwords are stored only as a secure hash by our
                  sign-in provider.
                </li>
                <li>
                  <b>Class records:</b> student names, student email addresses for grade
                  emails, scores, computed grades and attendance marks that teachers enter
                  or import.
                </li>
                <li>
                  <b>Teaching materials:</b> lesson plans, activities and files uploaded
                  to the modules library.
                </li>
                <li>
                  <b>Technical information:</b> sign-in session data, app settings and
                  attendance saved in your browser, and app stability reports that help us
                  keep Agilearn working.
                </li>
              </ul>
              <p>
                Grades and attendance are information about a person's education, which
                Section 3(l) of RA 10173 treats as <b>sensitive personal information</b>.
                Please don't enter other sensitive information, such as health details or
                government ID numbers, into Agilearn.
              </p>
            </section>

            <section id="p-why">
              <h2>
                <span className="n">04</span>Why we use it
              </h2>
              <ul>
                <li>To create, sign in to and secure your account</li>
                <li>
                  To run the classrooms, grades, attendance, modules, grade emails and
                  slideshows you ask for
                </li>
                <li>To keep the service secure, available and working well</li>
                <li>To contact you about your account and important changes</li>
              </ul>
              <p>
                We do not sell personal information, and we do not use it for advertising
                or profiling.
              </p>
            </section>

            <section id="p-minors">
              <h2>
                <span className="n">05</span>Students and minors
              </h2>
              <p>
                Many students are minors. Schools and teachers should tell students, and
                their parents or guardians where required, that their class records are
                kept in Agilearn. Only the teacher who owns a classroom, and Agilearn's
                admins, can open its records. Grade emails go only to each student's own
                address.
              </p>
            </section>

            <section id="p-share">
              <h2>
                <span className="n">06</span>Who can see it
              </h2>
              <ul>
                <li>
                  <b>The teacher who owns the classroom.</b>
                </li>
                <li>
                  <b>Agilearn admins</b>, for account support and approving school
                  domains.
                </li>
                <li>
                  <b>Service providers</b> that process data for us under written
                  agreements: Supabase (database, sign-in and file storage), Resend (email
                  delivery), Vercel (website hosting) and Bugsnag (app stability
                  monitoring).
                </li>
              </ul>
              <p>
                Some of these providers store data outside the Philippines. We use them
                only with the safeguards RA 10173 and its Implementing Rules require. We
                don't share personal information with anyone else unless the law requires
                it.
              </p>
            </section>

            <section id="p-protect">
              <h2>
                <span className="n">07</span>How we protect it
              </h2>
              <ul>
                <li>
                  Row-level security: the database itself checks every read and write
                  against who owns the class
                </li>
                <li>Private storage for module files, never public links</li>
                <li>Encrypted connections (HTTPS) between your device and Agilearn</li>
                <li>
                  Sign-up limited to approved school domains, and admin accounts created
                  only by the Agilearn team
                </li>
              </ul>
              <p>
                No system can promise perfect security, and we keep reviewing these
                safeguards.
              </p>
            </section>

            <section id="p-keep">
              <h2>
                <span className="n">08</span>How long we keep it
              </h2>
              <p>
                We keep account and class information while the account or classroom is
                active, or as long as your school requires. When a classroom is deleted or
                an account is closed, we delete or anonymize its information within{' '}
                <span className="ph">[number]</span> days, unless the law requires us to
                keep it longer. Backups expire within <span className="ph">[number]</span>{' '}
                days.
              </p>
            </section>

            <section id="p-rights">
              <h2>
                <span className="n">09</span>Your rights
              </h2>
              <p>Under RA 10173 you have the right to:</p>
              <div className="lg-rights">
                <div>
                  <b>Be informed</b>
                  <span>Know how your information is used, as this notice explains.</span>
                </div>
                <div>
                  <b>Access</b>
                  <span>Get a copy of the information we hold about you.</span>
                </div>
                <div>
                  <b>Object</b>
                  <span>Say no to processing you didn't agree to.</span>
                </div>
                <div>
                  <b>Erasure or blocking</b>
                  <span>Ask us to delete or stop using information.</span>
                </div>
                <div>
                  <b>Rectification</b>
                  <span>Have wrong information corrected.</span>
                </div>
                <div>
                  <b>Data portability</b>
                  <span>Get your information in a format you can take elsewhere.</span>
                </div>
                <div>
                  <b>Damages</b>
                  <span>Be paid for harm caused by misuse of your information.</span>
                </div>
                <div>
                  <b>File a complaint</b>
                  <span>
                    Complain to the National Privacy Commission at privacy.gov.ph.
                  </span>
                </div>
              </div>
              <p>
                To use a right, email our Data Protection Officer at{' '}
                <span className="ph">[dpo email]</span>. We reply within{' '}
                <span className="ph">[number]</span> days. For student records, we'll work
                with the school or teacher who controls them.
              </p>
            </section>

            <section id="p-breach">
              <h2>
                <span className="n">10</span>Breaches
              </h2>
              <p>
                If a security breach is likely to put you at real risk, we'll notify the
                National Privacy Commission and the people affected within 72 hours of
                learning about it, as the Commission's breach rules require. We'll tell
                you what happened and what you can do.
              </p>
            </section>

            <section id="p-storage">
              <h2>
                <span className="n">11</span>Browser storage
              </h2>
              <p>
                Agilearn stores only what the app needs in your browser: your sign-in
                session, theme and app settings, the last page you opened, and attendance
                saved offline until it syncs. We don't use advertising or cross-site
                tracking cookies.
              </p>
            </section>

            <section id="p-changes">
              <h2>
                <span className="n">12</span>Changes and contact
              </h2>
              <p>
                We'll post updates here and change the effective date. For significant
                changes, we'll tell you in the app or by email before they apply.
              </p>
              <p>
                Data Protection Officer: <span className="ph">[DPO name]</span> ·{' '}
                <span className="ph">[dpo email]</span> ·{' '}
                <span className="ph">[business address]</span>. You can also contact the
                National Privacy Commission at privacy.gov.ph.
              </p>
            </section>
          </article>
        </div>
      </section>

      <div className="c-wrap">
        <Link to="/terms" className="pg-next">
          <span>
            <small>Next page</small>
            <b>Terms of Use</b>
          </span>
          <ArrowRight className="ico" aria-hidden="true" />
        </Link>
      </div>
      <ReturnToSignup returnTo={returnTo} />
    </MarketingShell>
  )
}

export function TermsPage({ returnTo }: { returnTo?: string }) {
  usePageMeta(
    'Terms of Use (Draft) | Agilearn',
    'The terms for using Agilearn, governed by the laws of the Republic of the Philippines. Draft pending legal review.',
    '/terms',
  )
  const active = useSectionSpy(IDS_TERMS)
  return (
    <MarketingShell variant="page">
      <PageHero
        crumb="Terms of Use"
        kicker="Governed by Philippine law"
        title={
          <>
            Terms of <span className="it">Use.</span>
          </>
        }
        lead="The agreement between you and Agilearn, in plain language. Please read it together with the Privacy Notice."
      >
        <div className="pg-meta">
          <span>
            Effective <span className="ph">[date]</span>
          </span>
          <span className="draft">Draft for legal review</span>
        </div>
      </PageHero>

      <section className="pg-sec lg-sec">
        <div className="c-wrap lg-wrap">
          <nav className="lg-toc" aria-label="On this page">
            <b>On this page</b>
            <ol>
              {TOC_TERMS.map(([id, label]) => (
                <li key={id}>
                  <JumpLink id={id} active={active}>
                    {label}
                  </JumpLink>
                </li>
              ))}
            </ol>
          </nav>
          <article className="lg-doc">
            <section className="lg-sum" id="t-short">
              <h2>The short version</h2>
              <ul>
                <li>Agilearn is for teachers with an approved school email.</li>
                <li>
                  Your class records stay yours or your school's. We only process them to
                  run Agilearn for you.
                </li>
                <li>
                  Agilearn computes grades, but posting them is the teacher's decision.
                </li>
                <li>
                  Don't try to open classes that aren't yours, and keep your account to
                  yourself.
                </li>
              </ul>
            </section>
            <section id="t-agree">
              <h2>
                <span className="n">01</span>Agreeing to these terms
              </h2>
              <p>
                By creating an account or using Agilearn, you agree to these Terms and to
                our Privacy Notice. If you use Agilearn for a school, you confirm you're
                allowed to do so on its behalf.
              </p>
            </section>
            <section id="t-who">
              <h2>
                <span className="n">02</span>Who can use Agilearn
              </h2>
              <p>
                Teachers with an email on an approved school domain can sign up. Admin
                accounts are set up by the Agilearn team. Please give accurate information
                when you sign up.
              </p>
            </section>
            <section id="t-account">
              <h2>
                <span className="n">03</span>Your account
              </h2>
              <p>
                Keep your password private and don't share your account. If you think
                someone else used it, tell us at{' '}
                <span className="ph">[support email]</span> right away. You're responsible
                for what happens in your account.
              </p>
            </section>
            <section id="t-records">
              <h2>
                <span className="n">04</span>Your class records
              </h2>
              <p>
                Class records and teaching materials stay yours or your school's. You give
                us permission to store and process them only to run Agilearn for you, as
                the Privacy Notice describes. You confirm you're allowed to enter the
                student information you add, and you keep it accurate.
              </p>
            </section>
            <section id="t-grades">
              <h2>
                <span className="n">05</span>Grades are your decision
              </h2>
              <p>
                Agilearn computes finals from the weights and scores you set. Review
                grades before you post or email them. The final grade is the teacher's and
                the school's decision.
              </p>
            </section>
            <section id="t-use">
              <h2>
                <span className="n">06</span>Acceptable use
              </h2>
              <p>Please don't:</p>
              <ul>
                <li>Open, or try to open, classes or accounts that aren't yours</li>
                <li>
                  Upload unlawful content, or content you don't have the right to share
                </li>
                <li>Disrupt, overload, probe or reverse-engineer the service</li>
                <li>
                  Use Agilearn to send students messages they wouldn't expect from their
                  class
                </li>
              </ul>
            </section>
            <section id="t-avail">
              <h2>
                <span className="n">07</span>Availability and changes
              </h2>
              <p>
                We work to keep Agilearn available, and attendance keeps working offline.
                It may sometimes be unavailable for maintenance or for reasons outside our
                control. We may improve, change or retire features, and we'll give notice
                of significant changes.
              </p>
            </section>
            <section id="t-suspend">
              <h2>
                <span className="n">08</span>Suspension and closing an account
              </h2>
              <p>
                We may suspend an account that breaks these Terms or puts other people at
                risk. You can stop using Agilearn at any time. The Privacy Notice explains
                what happens to your information afterward.
              </p>
            </section>
            <section id="t-ip">
              <h2>
                <span className="n">09</span>Intellectual property
              </h2>
              <p>
                Agilearn's software, name and logo belong to{' '}
                <span className="ph">[legal name of operator]</span>. These Terms let you
                use the service; they don't transfer any of those rights to you.
              </p>
            </section>
            <section id="t-liab">
              <h2>
                <span className="n">10</span>Liability
              </h2>
              <p>
                To the extent Philippine law allows, Agilearn is provided as it is, and we
                are not liable for indirect or consequential losses. Nothing in these
                Terms limits liability that the law doesn't allow us to limit.
              </p>
            </section>
            <section id="t-law">
              <h2>
                <span className="n">11</span>Governing law
              </h2>
              <p>
                These Terms are governed by the laws of the Republic of the Philippines.
                Disputes go to the proper courts of <span className="ph">[city]</span>,
                unless the law provides otherwise.
              </p>
            </section>
            <section id="t-contact">
              <h2>
                <span className="n">12</span>Changes and contact
              </h2>
              <p>
                We'll post changes here with a new effective date and tell you about
                significant changes before they apply. Questions:{' '}
                <span className="ph">[legal name of operator]</span> ·{' '}
                <span className="ph">[support email]</span> ·{' '}
                <span className="ph">[business address]</span>.
              </p>
            </section>
          </article>
        </div>
      </section>

      <div className="c-wrap">
        <Link to="/" className="pg-next">
          <span>
            <small>Back to</small>
            <b>Home</b>
          </span>
          <ArrowRight className="ico" aria-hidden="true" />
        </Link>
      </div>
      <ReturnToSignup returnTo={returnTo} />
    </MarketingShell>
  )
}
