import { Table2 } from 'lucide-react'
import type { CSSVars } from '@/features/landing/bits'
import { MarketingShell, NextPage, PageHero } from './MarketingShell'
import { JumpLink, useSectionSpy } from './SectionNav'
import { usePageMeta } from './usePageMeta'

const CHIPS = [
  ['class-record', 'Class record'],
  ['attendance', 'Attendance'],
  ['modules', 'Modules'],
  ['emails', 'Grade emails'],
  ['slideshow', 'Slideshow'],
  ['admins', 'Admins'],
] as const
const IDS = CHIPS.map(([id]) => id)

export function FeaturesPage() {
  usePageMeta(
    'Features | Agilearn',
    'Class records with weighted finals, offline attendance, a private modules library, grade emails, slideshows and approved-school sign-up.',
    '/features',
  )
  const active = useSectionSpy(IDS)
  return (
    <MarketingShell variant="page">
      <PageHero
        crumb="Features"
        kicker="Six tools, one class record"
        title={
          <>
            Everything a <span className="it">teaching term</span> needs.
          </>
        }
        lead="Built around how a class actually runs: rosters, scores, attendance, materials, results and presenting them. Each part knows about the others."
      />
      <nav className="ft-chips" aria-label="Features on this page">
        <div className="c-wrap">
          {CHIPS.map(([id, label]) => (
            <JumpLink key={id} id={id} active={active}>
              {label}
            </JumpLink>
          ))}
        </div>
      </nav>

      <section className="ft-row" id="class-record" data-sec="class-record">
        <div className="c-wrap ft-grid">
          <div>
            <span className="eyebrow">Class record</span>
            <h2 className="pg-h2">
              One table for the <span className="it">whole class.</span>
            </h2>
            <ul className="ft-list">
              <li>A roster per section, with every score in one place</li>
              <li>Weighted lecture and lab finals, computed as you go</li>
              <li>Import from Excel or CSV in one step</li>
              <li>Export grades to PDF or a spreadsheet</li>
            </ul>
          </div>
          <div className="ft-vis">
            <div className="c-up">
              <div className="c-up-file">
                <Table2 className="ico" aria-hidden="true" />
                class-record-2A.xlsx<span className="c-up-pct">Imported</span>
              </div>
              <div className="c-up-bar">
                <i className="full" />
              </div>
              <div className="c-up-rows">
                <span>
                  <b>42</b>students
                </span>
                <span>
                  <b>6</b>graded columns
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="ft-row" id="attendance" data-sec="attendance">
        <div className="c-wrap ft-grid">
          <div>
            <span className="eyebrow">Attendance</span>
            <h2 className="pg-h2">
              Mark the class <span className="it">without a signal.</span>
            </h2>
            <ul className="ft-list">
              <li>Present, late or absent in a tap per student</li>
              <li>Saves on your device and syncs when you're online</li>
              <li>Choose which version to keep if two devices disagree</li>
              <li>A live attendance rate for every class</li>
            </ul>
          </div>
          <div className="ft-vis">
            <div className="c-att" role="img" aria-label="Sample attendance">
              <i className="p" style={{ '--k': 0 } as CSSVars} />
              <i className="p" style={{ '--k': 1 } as CSSVars} />
              <i className="p" style={{ '--k': 2 } as CSSVars} />
              <i className="l" style={{ '--k': 3 } as CSSVars} />
              <i className="p" style={{ '--k': 4 } as CSSVars} />
              <i className="p" style={{ '--k': 5 } as CSSVars} />
              <i className="a" style={{ '--k': 6 } as CSSVars} />
              <i className="p" style={{ '--k': 7 } as CSSVars} />
              <i className="p" style={{ '--k': 8 } as CSSVars} />
              <i className="p" style={{ '--k': 9 } as CSSVars} />
              <i className="p" style={{ '--k': 10 } as CSSVars} />
              <i className="l" style={{ '--k': 11 } as CSSVars} />
              <i className="p" style={{ '--k': 12 } as CSSVars} />
              <i className="p" style={{ '--k': 13 } as CSSVars} />
              <i className="p" style={{ '--k': 14 } as CSSVars} />
              <i className="p" style={{ '--k': 15 } as CSSVars} />
              <i className="p" style={{ '--k': 16 } as CSSVars} />
              <i className="p" style={{ '--k': 17 } as CSSVars} />
            </div>
            <div className="c-sync" aria-hidden="true">
              <span className="off">3 changes saved offline</span>
              <span className="on">Synced just now</span>
            </div>
          </div>
        </div>
      </section>

      <section className="ft-row" id="modules" data-sec="modules">
        <div className="c-wrap ft-grid">
          <div>
            <span className="eyebrow">Modules library</span>
            <h2 className="pg-h2">
              Lesson plans, <span className="it">ready to teach.</span>
            </h2>
            <ul className="ft-list">
              <li>Lesson plans, activity stories and resources in one library</li>
              <li>Kept in private storage, never public links</li>
              <li>Shared across your classes</li>
            </ul>
          </div>
          <div className="ft-vis">
            <div className="c-docs" aria-hidden="true">
              <span className="d1">Lesson plan · Week 3</span>
              <span className="d3">Sampling lab.pdf</span>
              <span className="d2">Activity story</span>
            </div>
          </div>
        </div>
      </section>

      <section className="ft-row" id="emails" data-sec="emails">
        <div className="c-wrap ft-grid">
          <div>
            <span className="eyebrow">Grade emails</span>
            <h2 className="pg-h2">
              Each student gets <span className="it">only their own.</span>
            </h2>
            <ul className="ft-list">
              <li>Post grades and email them in one step</li>
              <li>Every email carries one student's result only</li>
              <li>See which students have been emailed</li>
            </ul>
          </div>
          <div className="ft-vis">
            <div className="c-mail" aria-hidden="true">
              <small>To: k.ramos@yourschool.edu.ph</small>
              <b>Your midterm grade: 88.20</b>
              <span>Statistics 101 · Lecture 84 · Lab 91</span>
            </div>
          </div>
        </div>
      </section>

      <section className="ft-row" id="slideshow" data-sec="slideshow">
        <div className="c-wrap ft-grid">
          <div>
            <span className="eyebrow">Slideshow</span>
            <h2 className="pg-h2">
              Present the class <span className="it">in one click.</span>
            </h2>
            <ul className="ft-list">
              <li>Class average, top finals and progress as slides</li>
              <li>Ready for the review session or a faculty meeting</li>
            </ul>
          </div>
          <div className="ft-vis">
            <div className="c-slides" aria-hidden="true">
              <div className="c-slide s1">
                <small>Class average</small>
                <b>85.08</b>
              </div>
              <div className="c-slide s2">
                <small>Top final</small>
                <b>90.80</b>
              </div>
              <div className="c-slide s3">
                <small>Emailed</small>
                <b>2 / 5</b>
              </div>
              <div className="c-sdots">
                <i />
                <i />
                <i />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="ft-row" id="admins" data-sec="admins">
        <div className="c-wrap ft-grid">
          <div>
            <span className="eyebrow">Admins and schools</span>
            <h2 className="pg-h2">
              Approved schools <span className="it">only.</span>
            </h2>
            <ul className="ft-list">
              <li>Sign-up needs a school email on an approved domain</li>
              <li>Admins manage users and approve school domains</li>
              <li>Admin accounts are set up by the Agilearn team</li>
            </ul>
          </div>
          <div className="ft-vis">
            <div className="c-doms">
              <span className="ok">
                gordoncollege.edu.ph<em>Approved</em>
              </span>
              <span className="ok">
                yourschool.edu.ph<em>Approved</em>
              </span>
              <span className="wait">
                newschool.edu.ph<em>Requested</em>
              </span>
            </div>
            <div className="c-roles c-mt-12">
              <b>Teacher</b>
              <span>Admin</span>
            </div>
          </div>
        </div>
      </section>
      <NextPage to="/about" label="About Agilearn" />
    </MarketingShell>
  )
}
