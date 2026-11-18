import { useState } from 'react'
import { MarketingShell, NextPage, PageHero } from './MarketingShell'
import { CONTACT_EMAIL, DEVELOPER } from './site'
import { usePageMeta } from './usePageMeta'

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

export function DeveloperPage() {
  usePageMeta(
    'The developer | Agilearn',
    'Agilearn is designed, built and maintained by John Neo Lopez. Portfolio, LinkedIn and contact for questions, partnerships or bringing Agilearn to your school.',
    '/developer',
  )
  return (
    <MarketingShell variant="page">
      <PageHero
        crumb="The developer"
        kicker="Designed and built by"
        title={
          <>
            John Neo <span className="it">Lopez.</span>
          </>
        }
        lead="Agilearn is designed, built and maintained by one developer, for the teachers who use it every day."
      />
      <section className="pg-sec">
        <div className="c-wrap">
          <div className="dev-card">
            <span className="dev-av" aria-hidden="true">
              JNL
            </span>
            <div className="dev-body">
              <span className="dev-role">Get in touch</span>
              <h2 className="dev-name">{DEVELOPER.name}</h2>
              <p>
                For questions about the product, partnerships or bringing Agilearn to your
                school, get in touch.
              </p>
              <div className="dev-links">
                <a href={DEVELOPER.portfolio} target="_blank" rel="noopener noreferrer">
                  Portfolio <span aria-hidden="true">↗</span>
                  <span className="sr">(opens in a new tab)</span>
                </a>
                <a href={DEVELOPER.linkedin} target="_blank" rel="noopener noreferrer">
                  LinkedIn <span aria-hidden="true">↗</span>
                  <span className="sr">(opens in a new tab)</span>
                </a>
              </div>
              <CopyEmail />
            </div>
          </div>
        </div>
      </section>
      <NextPage to="/about" label="About Agilearn" />
    </MarketingShell>
  )
}
