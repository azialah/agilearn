import { useState } from 'react'
import { ShieldCheck, Table2, WifiOff } from 'lucide-react'
import { FaqAccordion, type FaqItem } from './FaqAccordion'
import { LANDING_FAQ } from './faq'
import { MarketingShell, NextPage, PageHero } from './MarketingShell'
import { CONTACT_EMAIL } from './site'
import { usePageMeta } from './usePageMeta'

const ABOUT_FAQ: FaqItem[] = [
  ...LANDING_FAQ.map((f) =>
    f.q.startsWith('My school')
      ? {
          ...f,
          a: 'Enter your school email at the bottom of the home page. If your domain isn’t approved yet, you can request access for your school right there.',
        }
      : f.q.startsWith('Can I import')
        ? {
            ...f,
            a: 'Import rosters and class records from Excel or CSV, and export grades to PDF or a spreadsheet.',
          }
        : f,
  ),
  {
    q: 'Who can see my class records?',
    a: 'Only you and Agilearn’s admins. The Privacy Notice explains how class records are protected under the Data Privacy Act of 2012.',
  },
]

/** Developer email with a Copy button; falls back to selecting the text. */
function CopyEmail() {
  const [note, setNote] = useState('')
  function selectIt(el: HTMLElement | null) {
    if (!el) return
    const range = document.createRange()
    range.selectNodeContents(el)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
    setNote('Selected. Press Ctrl+C or ⌘C to copy.')
  }
  return (
    <div className="dev-email">
      <span className="mono" id="dev-email">
        {CONTACT_EMAIL}
      </span>
      <button
        type="button"
        onClick={() => {
          const el = document.getElementById('dev-email')
          if (!navigator.clipboard) return selectIt(el)
          navigator.clipboard.writeText(CONTACT_EMAIL).then(
            () => setNote('Copied'),
            () => selectIt(el),
          )
        }}
      >
        Copy email
      </button>
      <span className="dev-copied" role="status">
        {note}
      </span>
    </div>
  )
}

export function AboutPage() {
  usePageMeta(
    'About | Agilearn',
    'Agilearn is a class-record, attendance and teaching-modules workspace made in the Philippines for Filipino classrooms, designed and built by John Neo Lopez.',
    '/about',
  )
  return (
    <MarketingShell variant="page">
      <PageHero
        crumb="About"
        kicker="Made in the Philippines"
        title={
          <>
            Built for the people who <span className="it">teach here.</span>
          </>
        }
        lead="Agilearn started with one question from grade season: why do teachers still rebuild the same spreadsheet every term? It’s a workspace for class records, attendance and teaching modules, made for Filipino classrooms."
      />
      <section className="pg-sec" id="name">
        <div className="c-wrap ab-name">
          <div>
            <span className="eyebrow">The name</span>
            <h2 className="pg-h2">
              Agila <span className="it">+ learn.</span>
            </h2>
            <p className="sub">
              Agila is Filipino for eagle. In 1995 the Philippine eagle was declared the
              country's national bird. Filipinos also call it Haribon, from{' '}
              <em>haring ibon</em>, "king of birds". It is sharp-eyed and exact, and
              that's the eagle in Agilearn: it watches the numbers so you can watch the
              class.
            </p>
          </div>
          <img
            className="ab-logo"
            src="/icon-512.png"
            loading="lazy"
            alt="The Agilearn logo: an orange A with an upward arrow over an open book, beside an eagle"
            width={192}
            height={192}
          />
        </div>
      </section>

      <section className="pg-sec">
        <div className="c-wrap">
          <span className="eyebrow">What we believe</span>
          <h2 className="pg-h2">
            Three promises <span className="it">to teachers.</span>
          </h2>
          <div className="ab-cards">
            <article className="ab-card">
              <span className="ic">
                <Table2 className="ico" aria-hidden="true" />
              </span>
              <h3>Teacher time first</h3>
              <p>
                Finals compute as you go, so grade season takes minutes, not a weekend.
              </p>
            </article>
            <article className="ab-card">
              <span className="ic">
                <ShieldCheck className="ico" aria-hidden="true" />
              </span>
              <h3>Private by default</h3>
              <p>
                The database itself checks every read and write. Your classes stay yours.
              </p>
            </article>
            <article className="ab-card">
              <span className="ic">
                <WifiOff className="ico" aria-hidden="true" />
              </span>
              <h3>Works where you teach</h3>
              <p>Install it on any phone. Attendance keeps working without a signal.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="pg-sec" id="developer">
        <div className="c-wrap">
          <span className="eyebrow">The developer</span>
          <div className="dev-card">
            <span className="dev-av" aria-hidden="true">
              JNL
            </span>
            <div className="dev-body">
              <span className="dev-role">Designed and built by</span>
              <h3>John Neo Lopez</h3>
              <p>
                Agilearn is designed, built and maintained by John Neo Lopez. For
                questions about the product, partnerships or bringing Agilearn to your
                school, get in touch.
              </p>
              <div className="dev-links">
                <a
                  href="https://johnneo-portfolio.netlify.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Portfolio <span aria-hidden="true">↗</span>
                </a>
                <a
                  href="https://www.linkedin.com/in/johnneomlpz"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  LinkedIn <span aria-hidden="true">↗</span>
                </a>
              </div>
              <CopyEmail />
            </div>
          </div>
        </div>
      </section>

      <section className="pg-sec" id="faq">
        <div className="c-wrap c-faq-grid">
          <div className="c-sec-head c-sec-head-grid">
            <span className="eyebrow">FAQ</span>
            <h2 className="pg-h2">
              Questions <span className="it">teachers ask.</span>
            </h2>
          </div>
          <FaqAccordion items={ABOUT_FAQ} />
        </div>
      </section>
      <NextPage to="/privacy" label="Privacy Notice" />
    </MarketingShell>
  )
}
