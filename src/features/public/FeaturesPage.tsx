import {
  CalendarDays,
  Files,
  GraduationCap,
  Presentation,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { PublicPageShell } from './PublicPageShell'

const features = [
  {
    icon: Users,
    title: 'Classrooms and rosters',
    body: 'Organize courses by year and block, build a roster by hand, or import a class from a spreadsheet.',
  },
  {
    icon: GraduationCap,
    title: 'Weighted gradebooks',
    body: 'Set grading periods, categories, activities, and lecture/laboratory weights. Agilearn keeps the final calculation clear and consistent.',
  },
  {
    icon: CalendarDays,
    title: 'Attendance with context',
    body: 'Create sessions, record present, absent, late, or excused statuses, and view a running summary for every student.',
  },
  {
    icon: Files,
    title: 'Teaching materials',
    body: 'Keep lesson plans, activities, and supporting resources together in a shared module library.',
  },
  {
    icon: Presentation,
    title: 'Ready to present',
    body: 'Turn classroom grades into a themed full-screen slideshow when it is time to present progress.',
  },
  {
    icon: ShieldCheck,
    title: 'Private by design',
    body: 'Teacher and administrator access is enforced through role-aware database policies, while teaching modules stay in private storage.',
  },
] as const

export function FeaturesPage() {
  return (
    <PublicPageShell
      eyebrow="The workspace"
      title="Teaching operations, brought into one steady rhythm."
      description="Agilearn brings the routines around classrooms, student progress, and teaching materials into a calmer place to work."
    >
      <section className="mx-auto max-w-5xl px-6 pb-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <article
                key={feature.title}
                className="rounded-2xl border border-(--color-border) bg-(--color-surface-1) p-6 shadow-(--shadow-card)"
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-(--color-accent-100) text-(--color-accent-350)">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h2 className="mt-5 text-xl font-semibold tracking-tight">
                  {feature.title}
                </h2>
                <p className="mt-3 text-sm leading-6 text-(--color-ink-muted)">
                  {feature.body}
                </p>
              </article>
            )
          })}
        </div>
      </section>
    </PublicPageShell>
  )
}
