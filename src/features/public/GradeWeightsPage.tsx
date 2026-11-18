import { WeightsEngine } from '@/features/landing/WeightsEngine'
import { MarketingShell, NextPage, PageHero } from './MarketingShell'
import { usePageMeta } from './usePageMeta'

export function GradeWeightsPage() {
  usePageMeta(
    'Grade weights | Agilearn',
    'How Agilearn computes finals: one formula, final = lecture weight × lecture + lab weight × lab, set once per class and applied to every student.',
    '/grade-weights',
  )
  return (
    <MarketingShell variant="page">
      <PageHero
        crumb="Grade weights"
        kicker="Weighted the way your syllabus is"
        title={
          <>
            One formula, <span className="it">every final.</span>
          </>
        }
        lead="Set the lecture and laboratory split once for a class. Agilearn applies it to every student and keeps each final current as you enter scores."
      />
      <WeightsEngine openPage={false} />
      <section className="pg-sec hw-w">
        <div className="c-wrap">
          <span className="eyebrow">The formula</span>
          <h2 className="pg-h2">
            Final = lecture + <span className="it">lab, weighted.</span>
          </h2>
          <div
            className="hw-formula"
            role="img"
            aria-label="Final equals 0.40 times lecture plus 0.60 times lab"
          >
            <span>Final</span>
            <i>=</i>
            <span>
              <b>0.40</b> × Lecture
            </span>
            <i>+</i>
            <span>
              <b>0.60</b> × Lab
            </span>
          </div>
          <p className="sub">
            Example: Ramos, K. has 84 in lecture and 91 in lab, so 0.40 × 84 + 0.60 × 91 ={' '}
            <b>88.20</b>. Finals are rounded to two decimals.
          </p>
        </div>
      </section>
      <section className="pg-sec">
        <div className="c-wrap">
          <span className="eyebrow">How it behaves</span>
          <h2 className="pg-h2">
            Set it once, <span className="it">change it any time.</span>
          </h2>
          <ul className="ft-list">
            <li>Each class has its own split, for example 40 / 60 or 50 / 50</li>
            <li>The two weights always add up to 100%</li>
            <li>Change the split and every final in the class updates</li>
            <li>The gradebook and this page use the same calculation</li>
          </ul>
        </div>
      </section>
      <NextPage to="/features" label="Features" />
    </MarketingShell>
  )
}
