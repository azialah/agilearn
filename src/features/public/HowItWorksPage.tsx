import { Link } from '@tanstack/react-router'
import { ArrowRight, Mail, Presentation, Table2, WifiOff } from 'lucide-react'
import { MarketingShell, NextPage, PageHero } from './MarketingShell'
import { usePageMeta } from './usePageMeta'

const RULER = [
  ...Array(6).fill('p'),
  ...Array(6).fill('mi'),
  ...Array(6).fill('f'),
] as string[]

export function HowItWorksPage() {
  usePageMeta(
    'How it works | Agilearn',
    'How a teaching term runs in Agilearn: set up once, take attendance anywhere, let finals compute themselves, then post, email and present grades.',
    '/how-it-works',
  )
  return (
    <MarketingShell variant="page">
      <PageHero
        crumb="How it works"
        kicker="From week 1 to week 18"
        title={
          <>
            How a term runs in <span className="it">Agilearn.</span>
          </>
        }
        lead="Set up once, then let each grading period pick up where the last one ended. Here is what you do at each stop, and what Agilearn does for you."
      >
        <div className="pg-ruler" aria-hidden="true">
          <div className="pg-ticks">
            {RULER.map((c, i) => (
              <i key={i} className={c} />
            ))}
          </div>
          <div className="pg-periods">
            <span>
              Prelim<em>weeks 1–6</em>
            </span>
            <span>
              Midterm<em>weeks 7–12</em>
            </span>
            <span>
              Finals<em>weeks 13–18</em>
            </span>
          </div>
        </div>
      </PageHero>
      <section className="hw-step" id="setup">
        <div className="c-wrap hw-grid">
          <div>
            <span className="hw-num">01</span>
            <span className="hw-when">Week 1 · Set up</span>
            <h2>Set up your classes once.</h2>
            <ol className="hw-list">
              <li>
                <b>Sign up with your school email.</b> Six short steps, from your account
                to your teaching levels.
              </li>
              <li>
                <b>Create a classroom.</b> Name the subject and section, like Statistics
                101 · BSIT 2-A.
              </li>
              <li>
                <b>Import your class record.</b> Drop an Excel or CSV file and the roster
                and scores come in.
              </li>
              <li>
                <b>Set the weights.</b> Choose the lecture and lab split, for example 40 /
                60.
              </li>
            </ol>
          </div>
          <div className="c-panel">
            <div className="c-drop">
              <Table2 className="ico" aria-hidden="true" />
              <div>
                <b>class-record-2A.xlsx</b>
                <span>42 rows read</span>
              </div>
            </div>
            <div className="c-cols">
              <span>Name</span>
              <span>Quiz 1</span>
              <span>Lab act 1</span>
              <span>Midterm exam</span>
              <span>+2</span>
            </div>
            <div className="c-prog">
              <i className="full" />
            </div>
            <div className="c-line">
              42 students in BSIT 2-A<span className="r">Imported</span>
            </div>
          </div>
        </div>
      </section>

      <section className="hw-step" id="prelim">
        <div className="c-wrap hw-grid">
          <div>
            <span className="hw-num">02</span>
            <span className="hw-when">Weeks 2–6 · Prelim</span>
            <h2>Take attendance anywhere.</h2>
            <ol className="hw-list">
              <li>
                <b>Start a session for today's class.</b> Every student on the roster is
                listed.
              </li>
              <li>
                <b>Mark present, late or absent.</b> It saves on your device, even without
                a signal.
              </li>
              <li>
                <b>Let it sync.</b> Changes upload when you're back online. If two devices
                disagree, you choose which to keep.
              </li>
              <li>
                <b>Teach from the library.</b> Lesson plans and activities wait in the
                modules library.
              </li>
            </ol>
          </div>
          <div className="c-panel">
            <div className="c-panel-h">
              <b>Tue · 7:30 AM session</b>
              <span className="c-off">
                <WifiOff className="ico" aria-hidden="true" />
                Saved on this device
              </span>
            </div>
            <div className="c-rrow">
              <span className="c-av">RA</span>Aquino, R.
              <span className="c-seg">
                <b>P</b>
                <i>L</i>
                <i>A</i>
              </span>
            </div>
            <div className="c-rrow">
              <span className="c-av">LB</span>Bautista, L.
              <span className="c-seg">
                <i>P</i>
                <b className="l">L</b>
                <i>A</i>
              </span>
            </div>
            <div className="c-rrow">
              <span className="c-av">JC</span>Cruz, J.
              <span className="c-seg">
                <i>P</i>
                <i>L</i>
                <b className="a">A</b>
              </span>
            </div>
            <div className="c-line">
              38 of 42 present<span className="r">90%</span>
            </div>
          </div>
        </div>
      </section>

      <section className="hw-step" id="midterm">
        <div className="c-wrap hw-grid">
          <div>
            <span className="hw-num">03</span>
            <span className="hw-when">Weeks 7–12 · Midterm</span>
            <h2>Finals that compute themselves.</h2>
            <ol className="hw-list">
              <li>
                <b>Enter scores.</b> Quizzes, lab activities and exams go straight into
                the class record.
              </li>
              <li>
                <b>Watch finals update.</b> Every student's final is recomputed as you
                type.
              </li>
              <li>
                <b>Read the class at a glance.</b> See the class average and how grades
                are spread.
              </li>
              <li>
                <b>Change the split any time.</b> Adjust the weights and every final
                follows.
              </li>
            </ol>
          </div>
          <div className="c-panel">
            <div className="c-panel-h">
              <b>Midterm finals</b>
              <span className="c-wchip2">Lecture 40 · Lab 60</span>
            </div>
            <div className="c-rrow">
              <span className="c-av">RA</span>Aquino, R.
              <span className="c-fin hi">90.60</span>
            </div>
            <div className="c-rrow">
              <span className="c-av">LB</span>Bautista, L.
              <span className="c-fin mid">82.70</span>
            </div>
            <div className="c-rrow">
              <span className="c-av">JC</span>Cruz, J.
              <span className="c-fin lo">73.10</span>
            </div>
            <div className="c-line">
              Class average<span className="r">85.08</span>
            </div>
          </div>
        </div>
      </section>

      <section className="hw-step" id="finals">
        <div className="c-wrap hw-grid">
          <div>
            <span className="hw-num">04</span>
            <span className="hw-when">Weeks 13–18 · Finals</span>
            <h2>Post, email, present.</h2>
            <ol className="hw-list">
              <li>
                <b>Review before you post.</b> Check each final against your class record.
              </li>
              <li>
                <b>Email each student.</b> Every student gets only their own grade.
              </li>
              <li>
                <b>Export.</b> Download grades as a PDF or a spreadsheet for your school.
              </li>
              <li>
                <b>Present.</b> Turn the class into a slideshow for the review session.
              </li>
            </ol>
          </div>
          <div className="c-panel hw-dark">
            <div className="c-panel-h">
              <b>
                <Mail className="ico" aria-hidden="true" />
                Grade emails sent
              </b>
              <span>42 / 42</span>
            </div>
            <div className="c-prog">
              <i className="full" />
            </div>
            <div className="c-thumbs">
              <div className="c-thumb">
                <small>Class average</small>
                <b>85.08</b>
              </div>
              <div className="c-thumb">
                <small>Top final</small>
                <b>90.80</b>
              </div>
              <div className="c-thumb">
                <small>Emailed</small>
                <b>42</b>
              </div>
            </div>
            <div className="c-line">
              <Presentation className="ico" aria-hidden="true" />
              Final slideshow ready<span className="r">Present</span>
            </div>
          </div>
        </div>
      </section>

      <section className="pg-sec hw-w" id="weights">
        <div className="c-wrap">
          <span className="eyebrow">Grade weights</span>
          <h2 className="pg-h2">
            One formula, <span className="it">every final.</span>
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
            <b>88.20</b>. Change the split and every final in the class updates. The
            landing page and the gradebook use the same calculation.
          </p>
          <Link to="/grade-weights" className="c-open">
            Open page <ArrowRight className="ico" aria-hidden="true" />
          </Link>
        </div>
      </section>
      <NextPage to="/features" label="Features" />
    </MarketingShell>
  )
}
