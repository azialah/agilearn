import { Link } from '@tanstack/react-router'
import { ArrowRight, Bird, Scale } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { PublicPageShell } from './PublicPageShell'

export function AboutPage() {
  return (
    <PublicPageShell
      eyebrow="About Agilearn"
      title="A calmer place to keep the work of teaching moving."
      description="Agilearn is a school-management workspace for teachers and administrators who need a clearer view of classes, student progress, and teaching materials."
    >
      <section className="mx-auto grid max-w-5xl gap-5 px-6 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-3xl border border-(--color-border) bg-(--color-surface-1) p-7 shadow-(--shadow-card) sm:p-9">
          <Bird className="size-8 text-(--color-accent-350)" aria-hidden="true" />
          <h2 className="mt-5 text-2xl font-semibold tracking-tight">
            Designed around the rhythms of a classroom.
          </h2>
          <div className="mt-5 space-y-4 text-sm leading-7 text-(--color-ink-muted)">
            <p>
              From rosters and attendance to weighted gradebooks and shared modules,
              Agilearn keeps the tools teachers reach for close together.
            </p>
            <p>
              The name is inspired by the Philippine eagle, the Haribon: attentive,
              precise, and built to see the larger picture without losing the detail.
            </p>
          </div>
        </article>
        <article className="rounded-3xl border border-(--color-border) bg-(--color-surface-2) p-7 sm:p-9">
          <Scale className="size-8 text-(--color-accent-350)" aria-hidden="true" />
          <h2 className="mt-5 text-2xl font-semibold tracking-tight">
            Clear roles, careful boundaries.
          </h2>
          <p className="mt-5 text-sm leading-7 text-(--color-ink-muted)">
            Teachers manage their own classrooms. Administrators have additional user and
            role-management tools. Access to classroom data is enforced at the database
            layer rather than left to interface decisions alone.
          </p>
          <Link to="/privacy" className="mt-7 inline-flex">
            <Button variant="outline" className="!rounded-full">
              Read the privacy draft <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </Link>
        </article>
      </section>
    </PublicPageShell>
  )
}
