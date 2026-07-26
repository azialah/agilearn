import { PublicHeader } from './PublicHeader'
import { PublicFooter } from './PublicFooter'

export function PublicPageShell({
  children,
  eyebrow,
  title,
  description,
}: {
  children: React.ReactNode
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <div className="min-h-dvh bg-(--color-surface-0) text-(--color-ink)">
      <PublicHeader />

      <main>
        <section className="relative isolate overflow-hidden px-6 pb-14 pt-20 sm:pb-18 sm:pt-24">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-0 -z-10 h-72 w-[min(52rem,120vw)] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,var(--color-accent-400),transparent_68%)] opacity-12 blur-3xl"
          />
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-(--color-accent-350)">
              {eyebrow}
            </p>
            <h1 className="mt-4 text-balance font-display text-4xl font-semibold leading-[1.04] tracking-tight sm:text-5xl lg:text-6xl">
              {title}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-7 text-(--color-ink-muted) sm:text-lg">
              {description}
            </p>
          </div>
        </section>

        {children}
      </main>

      <PublicFooter />
    </div>
  )
}
