import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  CalendarCheck,
  Check,
  Folder,
  Lock,
  Mail,
  Presentation,
  ShieldCheck,
  Table2,
  Users,
  WifiOff,
} from 'lucide-react'
import { useSpotlight } from '@/features/public/fx'
import { CountUp, Weeks, type CSSVars } from './bits'

/* Static landing sections, ported 1:1 from the approved Direction C mockup.
   Scroll-driven motion (frame tilt, card stacking, in-view reveals) is wired
   once for the whole page in LandingPage's useLandingMotion. */

export function ClassRecordSection() {
  return (
    <section className="c-reveal" aria-label="Product">
      <div className="c-wrap">
        <div className="c-reveal-head">
          <span className="eyebrow">The class record</span>
          <h2>
            Enter scores. <span className="it">The math is done.</span>
          </h2>
          <Link to="/features" hash="class-record" className="c-open">
            Open page <ArrowRight className="ico" aria-hidden="true" />
          </Link>
        </div>
        <div className="c-frame" data-reveal data-inview>
          <div className="c-frame-bar">
            <i />
            <i />
            <i />
            <span>Statistics 101 · BSIT 2-A · Midterm</span>
            <span className="c-tabs" aria-hidden="true">
              <b>Class record</b>
              <em>Attendance</em>
              <em>Modules</em>
            </span>
            <span className="c-wchip">Lecture 40 · Lab 60</span>
            <span className="pill live">Live</span>
          </div>
          <div className="c-frame-body">
            <table className="c-tbl">
              <thead>
                <tr>
                  <th>Student</th>
                  <th className="c-wide">Lecture</th>
                  <th className="c-wide">Lab</th>
                  <th>Final</th>
                  <th className="c-stcol">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <span className="c-who">
                      <span className="c-av">RA</span>Aquino, R.
                    </span>
                  </td>
                  <td className="c-wide n">
                    <span className="c-bar">
                      <i style={{ '--v': 0.885 } as CSSVars} />
                    </span>
                    88.50
                  </td>
                  <td className="c-wide n">
                    <span className="c-bar lab">
                      <i style={{ '--v': 0.92 } as CSSVars} />
                    </span>
                    92.00
                  </td>
                  <td>
                    <span className="c-fin hi">90.60</span>
                  </td>
                  <td className="c-stcol">
                    <span className="c-st ok">Emailed</span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <span className="c-who">
                      <span className="c-av">LB</span>Bautista, L.
                    </span>
                  </td>
                  <td className="c-wide n">
                    <span className="c-bar">
                      <i style={{ '--v': 0.7925 } as CSSVars} />
                    </span>
                    79.25
                  </td>
                  <td className="c-wide n">
                    <span className="c-bar lab">
                      <i style={{ '--v': 0.85 } as CSSVars} />
                    </span>
                    85.00
                  </td>
                  <td>
                    <span className="c-fin mid">82.70</span>
                  </td>
                  <td className="c-stcol">
                    <span className="c-st ok">Emailed</span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <span className="c-who">
                      <span className="c-av">JC</span>Cruz, J.
                    </span>
                  </td>
                  <td className="c-wide n">
                    <span className="c-bar">
                      <i style={{ '--v': 0.71 } as CSSVars} />
                    </span>
                    71.00
                  </td>
                  <td className="c-wide n">
                    <span className="c-bar lab">
                      <i style={{ '--v': 0.745 } as CSSVars} />
                    </span>
                    74.50
                  </td>
                  <td>
                    <span className="c-fin lo">73.10</span>
                  </td>
                  <td className="c-stcol">
                    <span className="c-st ready">Ready</span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <span className="c-who">
                      <span className="c-av">MD</span>Dela Rosa, M.
                    </span>
                  </td>
                  <td className="c-wide n">
                    <span className="c-bar">
                      <i style={{ '--v': 0.95 } as CSSVars} />
                    </span>
                    95.00
                  </td>
                  <td className="c-wide n">
                    <span className="c-bar lab">
                      <i style={{ '--v': 0.88 } as CSSVars} />
                    </span>
                    88.00
                  </td>
                  <td>
                    <span className="c-fin hi">90.80</span>
                  </td>
                  <td className="c-stcol">
                    <span className="c-st ready">Ready</span>
                  </td>
                </tr>
                <tr className="edit">
                  <td>
                    <span className="c-who">
                      <span className="c-av">KR</span>Ramos, K.
                    </span>
                  </td>
                  <td className="c-wide n">
                    <span className="c-bar">
                      <i style={{ '--v': 0.84 } as CSSVars} />
                    </span>
                    84.00
                  </td>
                  <td className="c-wide n focus">
                    <span className="c-bar lab">
                      <i style={{ '--v': 0.91 } as CSSVars} />
                    </span>
                    91.00
                    <span className="caret" aria-hidden="true" />
                  </td>
                  <td>
                    <span className="c-fin mid">88.20</span>
                  </td>
                  <td className="c-stcol">
                    <span className="c-st">Draft</span>
                  </td>
                </tr>
              </tbody>
            </table>
            <div className="c-score">
              <div className="c-avg">
                <small>Class average</small>
                <b>85.08</b>
                <span>Sample data · 5 of 42 students</span>
              </div>
              <div className="c-mix">
                <svg viewBox="0 0 64 64" aria-hidden="true">
                  <circle cx="32" cy="32" r="24" className="t" />
                  <circle
                    cx="32"
                    cy="32"
                    r="24"
                    className="lab"
                    pathLength="100"
                    strokeDasharray="60 40"
                    strokeDashoffset="-40"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="24"
                    className="lec"
                    pathLength="100"
                    strokeDasharray="40 60"
                  />
                </svg>
                <div>
                  <b>40 / 60</b>
                  <span>Lecture and lab weights, set once for the class</span>
                </div>
              </div>
              <div className="c-dist">
                <small>Final grades</small>
                <div
                  className="c-hist"
                  role="img"
                  aria-label="Distribution: 1 in 70s, 0 in 75–79, 1 in 80s, 1 in 85–89, 2 at 90 and up"
                >
                  <i style={{ '--h': 0.5 } as CSSVars} />
                  <i style={{ '--h': 0 } as CSSVars} />
                  <i style={{ '--h': 0.5 } as CSSVars} />
                  <i style={{ '--h': 0.5 } as CSSVars} />
                  <i style={{ '--h': 1 } as CSSVars} />
                </div>
                <div className="c-hist-l">
                  <span>70</span>
                  <span>75</span>
                  <span>80</span>
                  <span>85</span>
                  <span>90+</span>
                </div>
              </div>
              <div className="c-sts">
                <span className="c-st ok">2 emailed</span>
                <span className="c-st ready">2 ready</span>
                <span className="c-st">1 draft</span>
              </div>
            </div>
          </div>
        </div>
        <div className="c-stats">
          <div className="c-stat">
            <CountUp to={6} />
            <span>Steps from school email to your first class</span>
          </div>
          <div className="c-stat">
            <CountUp to={1} />
            <span>Grade formula, shared by the gradebook and this page</span>
          </div>
          <div className="c-stat">
            <CountUp to={2} />
            <span>Roles: teacher and admin</span>
          </div>
          <div className="c-stat">
            <CountUp to={100} suffix="%" />
            <span>Of tables behind row-level security</span>
          </div>
        </div>
      </div>
    </section>
  )
}

export function TermSection() {
  return (
    <section className="c-stack" id="how-it-works" aria-label="A term in Agilearn">
      <div className="c-wrap">
        <div className="c-sec-head">
          <h2>
            A term, <span className="it">in four stops.</span>
          </h2>
          <p>
            Each grading period picks up where the last one ended, from the first roster
            to the last posted grade.
          </p>
          <Link to="/how-it-works" className="c-open">
            Open page <ArrowRight className="ico" aria-hidden="true" />
          </Link>
        </div>
        <ol className="c-cards">
          <li className="c-card" style={{ '--i': 0 } as CSSVars}>
            <div className="c-card-l">
              <div className="c-card-top">
                <span className="num">01</span>
                <span className="when">
                  Week 1<b>Set up</b>
                </span>
              </div>
              <Weeks from={1} to={1} />
              <h3>Import your class record.</h3>
              <p>
                Bring rosters and existing scores in from Excel or CSV. Every class gets
                its own private record.
              </p>
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
                <i />
              </div>
              <div className="c-line">
                42 students in BSIT 2-A<span className="r">Imported</span>
              </div>
            </div>
          </li>
          <li className="c-card" style={{ '--i': 1 } as CSSVars}>
            <div className="c-card-l">
              <div className="c-card-top">
                <span className="num">02</span>
                <span className="when">
                  Weeks 2–6<b>Prelim</b>
                </span>
              </div>
              <Weeks from={2} to={6} />
              <h3>Take attendance anywhere.</h3>
              <p>
                Mark present, late or absent, even offline. Lesson plans wait in the
                shared module library.
              </p>
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
          </li>
          <li className="c-card" style={{ '--i': 2 } as CSSVars}>
            <div className="c-card-l">
              <div className="c-card-top">
                <span className="num">03</span>
                <span className="when">
                  Week 9<b>Midterm</b>
                </span>
              </div>
              <Weeks from={7} to={12} />
              <h3>Finals that compute themselves.</h3>
              <p>
                Set lecture and lab weights once. Every student's final updates as you
                enter scores.
              </p>
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
          </li>
          <li className="c-card" style={{ '--i': 3 } as CSSVars}>
            <div className="c-card-l">
              <div className="c-card-top">
                <span className="num">04</span>
                <span className="when">
                  Week 18<b>Finals</b>
                </span>
              </div>
              <Weeks from={13} to={18} />
              <h3>Post, email, present.</h3>
              <p>
                Email each student their own result, then turn the class into a slideshow
                for the review session.
              </p>
            </div>
            <div className="c-panel">
              <div className="c-panel-h">
                <b>
                  <Mail className="ico" aria-hidden="true" />
                  Grade emails sent
                </b>
                <span>42 / 42</span>
              </div>
              <div className="c-prog">
                <i />
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
          </li>
        </ol>
      </div>
    </section>
  )
}

export function FeaturesBento() {
  const spot = useSpotlight()
  return (
    <section className="c-bento" id="features" aria-label="Features">
      <div className="c-wrap">
        <div className="c-sec-head">
          <h2>
            Everything a <span className="it">teaching term</span> needs.
          </h2>
          <p>Built around how a class actually runs, not around a spreadsheet.</p>
          <Link to="/features" className="c-open">
            Open page <ArrowRight className="ico" aria-hidden="true" />
          </Link>
        </div>
        <div className="c-bgrid" data-inview>
          <article {...spot} className="c-spot big">
            <span className="ic">
              <Table2 className="ico" aria-hidden="true" />
            </span>
            <h3>Class record</h3>
            <p>
              Rosters, weighted scores and finals in one table. Import from Excel, export
              to PDF or a spreadsheet.
            </p>
            <div className="huge">
              42<small>students, one Excel file</small>
            </div>
            <div className="c-up c-mt-18">
              <div className="c-up-file">
                <Table2 className="ico" aria-hidden="true" />
                class-record-2A.xlsx<span className="c-up-pct">Imported</span>
              </div>
              <div className="c-up-bar">
                <i />
              </div>
              <div className="c-up-rows">
                <span>
                  <b>6</b>graded columns
                </span>
                <span>
                  <b>1</b>click to export
                </span>
              </div>
            </div>
          </article>
          <article {...spot} className="c-spot att">
            <span className="ic">
              <CalendarCheck className="ico" aria-hidden="true" />
            </span>
            <h3>Attendance, offline</h3>
            <p>Mark the class without a signal. It syncs when you&apos;re back.</p>
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
          </article>
          <article {...spot} className="c-spot mod">
            <span className="ic">
              <Folder className="ico" aria-hidden="true" />
            </span>
            <h3>Modules library</h3>
            <p>Lesson plans and activities in private storage.</p>
            <div className="c-docs" aria-hidden="true">
              <span className="d1">Lesson plan · Week 3</span>
              <span className="d3">Sampling lab.pdf</span>
              <span className="d2">Activity story</span>
            </div>
          </article>
          <article {...spot} className="c-spot mail">
            <span className="ic">
              <Mail className="ico" aria-hidden="true" />
            </span>
            <h3>Grade emails</h3>
            <p>Each student gets only their own result.</p>
            <div className="c-mail" aria-hidden="true">
              <small>To: k.ramos@yourschool.edu.ph</small>
              <b>Your midterm grade: 88.20</b>
              <span>Statistics 101 · Lecture 84 · Lab 91</span>
            </div>
          </article>
          <article {...spot} className="c-spot show">
            <span className="ic">
              <Presentation className="ico" aria-hidden="true" />
            </span>
            <h3>Slideshow</h3>
            <p>A presentable grade slideshow in one click.</p>
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
          </article>
          <article {...spot} className="c-spot wide">
            <div className="c-wtxt">
              <span className="ic">
                <Users className="ico" aria-hidden="true" />
              </span>
              <h3>Admins and approved schools</h3>
              <p>
                Admins manage users and school domains. Teachers stay focused on their
                classes.
              </p>
            </div>
            <div className="c-wui" aria-hidden="true">
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
              <div className="c-roles">
                <b>Teacher</b>
                <span>Admin</span>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}

export function PrivacyBand({ openPage = true }: { openPage?: boolean }) {
  return (
    <section className="c-priv" id="privacy" aria-label="Privacy" data-inview>
      <div className="c-wrap">
        <div>
          <span className="eyebrow c-eyebrow-solid">Privacy</span>
          <h2 className="c-mt-12">
            Your rosters stay <span className="c-hl">yours.</span>
          </h2>
          <p className="lead">
            Every read and write is checked by the database itself, so your classes stay
            visible only to you and Agilearn&apos;s admins.
          </p>
          {openPage && (
            <Link to="/security" className="c-open">
              Open page <ArrowRight className="ico" aria-hidden="true" />
            </Link>
          )}
        </div>
        <ul className="c-plist">
          <li>
            <ShieldCheck className="ico" aria-hidden="true" />
            <b>Row-level security</b>
            <span>Postgres checks every read and write.</span>
          </li>
          <li>
            <Users className="ico" aria-hidden="true" />
            <b>Only your classes</b>
            <span>Rosters, grades and attendance stay with their teacher.</span>
          </li>
          <li>
            <Lock className="ico" aria-hidden="true" />
            <b>Private file storage</b>
            <span>Module files are never public links.</span>
          </li>
          <li>
            <Check className="ico" aria-hidden="true" />
            <b>Approved schools only</b>
            <span>Sign-up needs a school email on an approved domain.</span>
          </li>
        </ul>
      </div>
    </section>
  )
}
