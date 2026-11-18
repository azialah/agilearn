import { FaqAccordion } from './FaqAccordion'
import { FULL_FAQ } from './faq'
import { MarketingShell, NextPage, PageHero } from './MarketingShell'
import { usePageMeta } from './usePageMeta'

export function FaqPage() {
  usePageMeta(
    'FAQ | Agilearn',
    'Answers to the questions teachers ask about Agilearn: sign-up, approved schools, grade weights, imports and exports, offline attendance and privacy.',
    '/faq',
  )
  return (
    <MarketingShell variant="page">
      <PageHero
        crumb="FAQ"
        kicker="Answers for teachers"
        title={
          <>
            Questions <span className="it">teachers ask.</span>
          </>
        }
        lead="Sign-up, grades, attendance and privacy, in short answers. Open one at a time."
      />
      <section className="pg-sec">
        <div className="c-wrap">
          <FaqAccordion items={FULL_FAQ} />
        </div>
      </section>
      <NextPage to="/request-access" label="Request access for your school" />
    </MarketingShell>
  )
}
