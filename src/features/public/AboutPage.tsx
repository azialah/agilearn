import { Link } from '@tanstack/react-router'
import { ArrowRight, ShieldCheck, Table2, WifiOff } from 'lucide-react'
import { FaqAccordion } from './FaqAccordion'
import { FULL_FAQ } from './faq'
import { MarketingShell, NextPage, PageHero } from './MarketingShell'
import { usePageMeta } from './usePageMeta'

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

      <section className="pg-sec">
        <div className="c-wrap ab-links">
          <div>
            <span className="eyebrow">The developer</span>
            <h2 className="pg-h2">
              Designed and built <span className="it">in the Philippines.</span>
            </h2>
            <p className="sub">
              Agilearn is designed, built and maintained by John Neo Lopez.
            </p>
            <Link to="/developer" className="c-open">
              Meet the developer <ArrowRight className="ico" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section className="pg-sec">
        <div className="c-wrap c-faq-grid">
          <div className="c-sec-head c-sec-head-grid">
            <span className="eyebrow">FAQ</span>
            <h2 className="pg-h2">
              Questions <span className="it">teachers ask.</span>
            </h2>
            <Link to="/faq" className="c-open">
              All questions <ArrowRight className="ico" aria-hidden="true" />
            </Link>
          </div>
          <FaqAccordion items={FULL_FAQ.slice(0, 3)} />
        </div>
      </section>
      <NextPage to="/developer" label="The developer" />
    </MarketingShell>
  )
}
