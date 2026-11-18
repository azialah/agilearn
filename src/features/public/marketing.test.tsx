import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from '@tanstack/react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computeFinalGrade } from '@/lib/grading'
import robots from '../../../public/robots.txt?raw'
import sitemap from '../../../public/sitemap.txt?raw'
import howSrc from './HowItWorksPage.tsx?raw'
import legalSrc from './LegalPages.tsx?raw'
import aboutSrc from './AboutPage.tsx?raw'
import ctaSrc from '../landing/StartCta.tsx?raw'

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
  isStandalone: () => false,
}))

// jsdom has no matchMedia / IntersectionObserver; `reduce` flips prefers-reduced-motion.
let reduce = false
beforeEach(() => {
  reduce = false
  window.matchMedia = ((query: string) => ({
    matches: query.includes('prefers-reduced-motion') ? reduce : false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia
  class IO {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  }
  window.IntersectionObserver = IO as unknown as typeof IntersectionObserver
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
})

async function renderAt(ui: () => ReactNode, entries: string[] = ['/']) {
  const rootRoute = createRootRoute({ component: ui })
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({
      initialEntries: entries,
      initialIndex: entries.length - 1,
    }),
  })
  const qc = new QueryClient()
  await act(async () => {
    render(
      <QueryClientProvider client={qc}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )
  })
  return router
}

describe('public site data', () => {
  it('points every footer link at a real public route, never password reset', async () => {
    const { FOOTER_COLUMNS } = await import('./site')
    const routes = [
      '/',
      '/how-it-works',
      '/features',
      '/about',
      '/privacy',
      '/terms',
      '/login',
      '/teacher/signup',
    ]
    const links = FOOTER_COLUMNS.flatMap((c) => c.links)
    expect(links.length).toBeGreaterThan(10)
    for (const l of links) expect(routes).toContain(l.to)
    expect(JSON.stringify(FOOTER_COLUMNS)).not.toMatch(/forgot|reset/i)
  })

  it('has an element for every hash the footer links to', async () => {
    const { FOOTER_COLUMNS } = await import('./site')
    const file: Record<string, string> = {
      '/how-it-works': howSrc,
      '/privacy': legalSrc,
      '/about': aboutSrc,
      '/': ctaSrc,
    }
    for (const l of FOOTER_COLUMNS.flatMap((c) => c.links)) {
      if (!l.hash) continue
      expect(file[l.to], `${l.to}#${l.hash}`).toMatch(new RegExp(`id="${l.hash}"`))
    }
  })

  it('parses school-email domains', async () => {
    const { emailDomain } = await import('./site')
    expect(emailDomain(' Teacher@GordonCollege.edu.ph ')).toBe('gordoncollege.edu.ph')
    expect(emailDomain('no-at-sign')).toBeNull()
    expect(emailDomain('@gordoncollege.edu.ph')).toBeNull()
    expect(emailDomain('x@localhost')).toBeNull()
  })

  it('lists every public page in the sitemap and keeps the app out of robots', () => {
    for (const p of ['/', '/how-it-works', '/features', '/about', '/privacy', '/terms']) {
      expect(sitemap).toContain(`https://agilearn.vercel.app${p}\n`)
    }
    expect(robots).toMatch(/Disallow: \/teacher\//)
    expect(robots).toMatch(/Disallow: \/forgot-password/)
    expect(robots).toMatch(/Sitemap: https:\/\/agilearn\.vercel\.app\/sitemap\.txt/)
  })
})

describe('marketing copy', () => {
  it('never says "bug" or "error" in visible text', async () => {
    const { LandingPage } = await import('@/features/landing/LandingPage')
    const { HowItWorksPage } = await import('./HowItWorksPage')
    const { FeaturesPage } = await import('./FeaturesPage')
    const { AboutPage } = await import('./AboutPage')
    const { PrivacyPage, TermsPage } = await import('./LegalPages')
    for (const Page of [
      LandingPage,
      HowItWorksPage,
      FeaturesPage,
      AboutPage,
      PrivacyPage,
      TermsPage,
    ]) {
      await renderAt(() => <Page />)
      expect(document.body.textContent ?? '').not.toMatch(/\b(bugs?|errors?)\b/i)
      expect(document.body.textContent ?? '').not.toMatch(/reset your password/i)
      cleanup()
    }
  }, 30_000)
})

describe('FaqAccordion', () => {
  it('keeps only one answer open at a time', async () => {
    const { FaqAccordion } = await import('./FaqAccordion')
    const items = [
      { q: 'One?', a: 'A1' },
      { q: 'Two?', a: 'A2' },
      { q: 'Three?', a: 'A3' },
    ]
    render(<FaqAccordion items={items} />)
    const details = () =>
      Array.from(document.querySelectorAll('details')).map((d) => d.open)
    expect(details()).toEqual([true, false, false])
    fireEvent.click(screen.getByText('Two?'))
    expect(details()).toEqual([false, true, false])
    fireEvent.click(screen.getByText('Two?'))
    expect(details()).toEqual([false, false, false])
    fireEvent.click(screen.getByText('Three?'))
    expect(details()).toEqual([false, false, true])
  })
})

describe('BackButton', () => {
  it('goes back through in-app history when there is some', async () => {
    const { BackButton } = await import('./MarketingShell')
    const router = await renderAt(() => <BackButton />, ['/'])
    await act(() => router.navigate({ to: '/features' }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Back' }))
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(router.state.location.pathname).toBe('/')
    expect(router.history.length).toBe(2)
  })

  it('goes Home when the page was opened directly', async () => {
    const { BackButton } = await import('./MarketingShell')
    const router = await renderAt(() => <BackButton />, ['/privacy'])
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Back' }))
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(router.state.location.pathname).toBe('/')
  })
})

describe('landing weights demo', () => {
  it('matches computeFinalGrade as the keys change the split', async () => {
    const { LandingPage } = await import('@/features/landing/LandingPage')
    await renderAt(() => <LandingPage />)
    const formula = () => document.querySelector('[data-formula]')?.textContent
    expect(formula()).toBe('0.40 × 84 + 0.60 × 91')
    expect(screen.getByText(/Final grade 88\.20/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Raise lecture weight' }))
    fireEvent.click(screen.getByRole('button', { name: 'Raise lab score' }))
    const expected = computeFinalGrade(84, 92, 0.45, 0.55)?.toFixed(2)
    expect(formula()).toBe('0.45 × 84 + 0.55 × 92')
    expect(screen.getByText(new RegExp(`Final grade ${expected}`))).toBeInTheDocument()
  })
})

describe('reduced motion', () => {
  it('keeps the split-flap headline still', async () => {
    reduce = true
    vi.useFakeTimers()
    try {
      const { SplitFlap } = await import('@/features/landing/bits')
      render(<SplitFlap words={['FINALS', 'GRADES']} />)
      const text = () => document.querySelector('.c-board')?.textContent
      expect(text()).toBe('FINALS')
      act(() => vi.advanceTimersByTime(8000))
      expect(text()).toBe('FINALS')
      expect(document.querySelector('.c-tile.flip')).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('usePageMeta', () => {
  it('sets the title, description and canonical URL for the page', async () => {
    const { FeaturesPage } = await import('./FeaturesPage')
    await renderAt(() => <FeaturesPage />, ['/features'])
    expect(document.title).toBe('Features | Agilearn')
    expect(
      document.head.querySelector('link[rel="canonical"]')?.getAttribute('href'),
    ).toBe('https://agilearn.vercel.app/features')
    expect(
      document.head.querySelector('meta[name="description"]')?.getAttribute('content'),
    ).toMatch(/Class records/)
  })
})

describe('stress', () => {
  it('clamps the weights demo under key spam', async () => {
    const { LandingPage } = await import('@/features/landing/LandingPage')
    await renderAt(() => <LandingPage />)
    const right = screen.getByRole('button', { name: 'Raise lecture weight' })
    const left = screen.getByRole('button', { name: 'Lower lecture weight' })
    const up = screen.getByRole('button', { name: 'Raise lab score' })
    for (let i = 0; i < 60; i++) fireEvent.click(right)
    for (let i = 0; i < 30; i++) fireEvent.click(up)
    expect(
      screen.getByText(/Lecture 100 percent, laboratory 0 percent\. Final grade 84\.00/),
    ).toBeInTheDocument()
    for (let i = 0; i < 60; i++) fireEvent.click(left)
    expect(
      screen.getByText(/Lecture 0 percent, laboratory 100 percent\. Final grade 100\.00/),
    ).toBeInTheDocument()
    // Keyboard arrows only drive the demo while the panel is hovered or focused.
    fireEvent.keyDown(document, { key: 'ArrowRight' })
    expect(screen.getByText(/Lecture 0 percent/)).toBeInTheDocument()
    fireEvent.pointerEnter(document.querySelector('.c-eng-panel') as Element)
    fireEvent.keyDown(document, { key: 'ArrowRight' })
    expect(screen.getByText(/Lecture 5 percent/)).toBeInTheDocument()
  })

  it('never leaves more than one FAQ answer open under rapid clicking', async () => {
    const { FaqAccordion } = await import('./FaqAccordion')
    const items = Array.from({ length: 6 }, (_, i) => ({ q: `Q${i}?`, a: `A${i}` }))
    render(<FaqAccordion items={items} />)
    for (let i = 0; i < 200; i++) {
      fireEvent.click(screen.getByText(`Q${(i * 7) % 6}?`))
      const open = document.querySelectorAll('details[open]').length
      expect(open).toBeLessThanOrEqual(1)
    }
  })
})
