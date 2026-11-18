import { Link } from '@tanstack/react-router'
import { PrivacyBand } from '@/features/landing/LandingSections'
import { MarketingShell, NextPage, PageHero } from './MarketingShell'
import { usePageMeta } from './usePageMeta'

export function SecurityPage() {
  usePageMeta(
    'Privacy and security | Agilearn',
    'How Agilearn keeps class records private: database row-level security, private file storage, approved school domains and per-student grade emails.',
    '/security',
  )
  return (
    <MarketingShell variant="page">
      <PageHero
        crumb="Privacy and security"
        kicker="Private by default"
        title={
          <>
            Your rosters stay <span className="it">yours.</span>
          </>
        }
        lead="Class records hold grades and attendance, which the Data Privacy Act treats as sensitive. Here is how Agilearn keeps them with the teacher who owns them."
      />
      <PrivacyBand openPage={false} />

      <section className="ft-row">
        <div className="c-wrap ft-grid">
          <div>
            <span className="eyebrow">Row-level security</span>
            <h2 className="pg-h2">
              The database <span className="it">checks every request.</span>
            </h2>
            <ul className="ft-list">
              <li>Postgres row-level security checks every read and write</li>
              <li>A teacher reaches only the classrooms they own</li>
              <li>The check runs in the database, not just in the app</li>
            </ul>
          </div>
          <div className="ft-vis">
            <div className="c-roles">
              <b>Teacher</b>
              <span>Admin</span>
            </div>
          </div>
        </div>
      </section>

      <section className="ft-row">
        <div className="c-wrap ft-grid">
          <div>
            <span className="eyebrow">Accounts</span>
            <h2 className="pg-h2">
              Approved schools <span className="it">only.</span>
            </h2>
            <ul className="ft-list">
              <li>Sign-up needs a school email on an approved domain</li>
              <li>New accounts start as teachers and can’t promote themselves</li>
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
          </div>
        </div>
      </section>

      <section className="ft-row">
        <div className="c-wrap ft-grid">
          <div>
            <span className="eyebrow">Files and emails</span>
            <h2 className="pg-h2">
              Nothing shared <span className="it">by accident.</span>
            </h2>
            <ul className="ft-list">
              <li>Module files live in private storage, never public links</li>
              <li>Each grade email carries one student’s result only</li>
              <li>Emails are sent under the same database checks as the teacher</li>
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

      <section className="pg-sec">
        <div className="c-wrap">
          <span className="eyebrow">The law</span>
          <h2 className="pg-h2">
            Written to follow <span className="it">RA 10173.</span>
          </h2>
          <p className="sub">
            The <Link to="/privacy">Privacy Notice</Link> explains what Agilearn collects,
            why, who can see it and your rights under the Data Privacy Act of 2012.
          </p>
        </div>
      </section>
      <NextPage to="/privacy" label="Privacy Notice" />
    </MarketingShell>
  )
}
