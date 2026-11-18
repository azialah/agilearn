import { act, render } from '@testing-library/react'
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from '@tanstack/react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import swRoutes from '../../../public/sw-routes.js?raw'
import viteConfig from '../../../vite.config.ts?raw'
import { BootSplashDismissal } from '@/components/ui/BootSplashDismissal'

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
  isStandalone: () => false,
}))

type IOCallback = (entries: { isIntersecting: boolean }[]) => void
let ioCallbacks: IOCallback[] = []

beforeEach(() => {
  ioCallbacks = []
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia
  class IO {
    constructor(cb: IOCallback) {
      ioCallbacks.push(cb)
    }
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  }
  window.IntersectionObserver = IO as unknown as typeof IntersectionObserver
})

afterEach(() => {
  document.getElementById('app-boot-splash')?.remove()
  vi.useRealTimers()
})

async function renderInRouter(ui: () => React.ReactNode) {
  const router = createRouter({
    routeTree: createRootRoute({ component: ui }),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  await act(async () => {
    render(<RouterProvider router={router} />)
  })
  return router
}

function addSplash() {
  const splash = document.createElement('div')
  splash.id = 'app-boot-splash'
  const mark = document.createElement('div')
  mark.className = 'bs-mark'
  splash.appendChild(mark)
  document.body.appendChild(splash)
  return { splash, mark }
}

function transitionEnd(target: Element, propertyName: string) {
  const e = new Event('transitionend', { bubbles: true }) as Event & {
    propertyName: string
  }
  Object.defineProperty(e, 'propertyName', { value: propertyName })
  target.dispatchEvent(e)
}

describe('boot splash dismissal (iris)', () => {
  it('waits for the splash’s own opacity fade, ignoring child transitions', async () => {
    const { splash, mark } = addSplash()
    await renderInRouter(() => <BootSplashDismissal />)
    await act(() => new Promise((r) => requestAnimationFrame(() => r(undefined))))
    expect(splash.dataset.ready).toBe('true')
    transitionEnd(mark, 'opacity') // the logo's own fade bubbles up first
    transitionEnd(splash, '--iris')
    expect(document.getElementById('app-boot-splash')).not.toBeNull()
    transitionEnd(splash, 'opacity')
    expect(document.getElementById('app-boot-splash')).toBeNull()
  })

  it('still removes the splash when no transition ever fires', async () => {
    const { splash } = addSplash()
    await renderInRouter(() => <BootSplashDismissal />)
    await act(() => new Promise((r) => requestAnimationFrame(() => r(undefined))))
    expect(splash.dataset.ready).toBe('true')
    await act(() => new Promise((r) => setTimeout(r, 1150)))
    expect(document.getElementById('app-boot-splash')).toBeNull()
  })
})

describe('footer wordmark wave', () => {
  it('runs only while the wordmark is on screen', async () => {
    const { SiteFooter } = await import('./SiteFooter')
    await renderInRouter(() => <SiteFooter />)
    const word = document.querySelector('.c-word') as HTMLElement
    expect(word.querySelectorAll('span')).toHaveLength(8)
    expect(word.classList.contains('live')).toBe(false)
    for (let i = 0; i < 50; i++) {
      act(() => ioCallbacks.forEach((cb) => cb([{ isIntersecting: i % 2 === 0 }])))
    }
    expect(word.classList.contains('live')).toBe(false)
    act(() => ioCallbacks.forEach((cb) => cb([{ isIntersecting: true }])))
    expect(word.classList.contains('live')).toBe(true)
  })
})

describe('shell', () => {
  it('has no phone CTA dock and keeps the hidden back-to-top button inert', async () => {
    const { MarketingShell } = await import('./MarketingShell')
    await renderInRouter(() => (
      <MarketingShell variant="page">
        <p>content</p>
      </MarketingShell>
    ))
    expect(document.querySelector('.c-dock')).toBeNull()
    expect(document.querySelector('.c-fab')?.hasAttribute('inert')).toBe(true)
  })
})

describe('service worker static routes (sw-routes.js)', () => {
  function runSw(installEvent: object) {
    const listeners: Record<string, (e: object) => void> = {}
    const self = {
      addEventListener: (t: string, fn: (e: object) => void) => (listeners[t] = fn),
    }
    new Function('self', swRoutes)(self)
    listeners.install(installEvent)
  }

  it('registers network routes for Supabase and the crawler files', () => {
    const addRoutes = vi.fn(() => Promise.resolve())
    runSw({ addRoutes })
    expect(addRoutes).toHaveBeenCalledTimes(2)
    const rules = JSON.stringify(addRoutes.mock.calls)
    expect(rules).toContain('https://*.supabase.co/*')
    for (const f of ['/robots.txt', '/sitemap.txt', '/llms.txt'])
      expect(rules).toContain(f)
    expect(rules).not.toContain('"fetch-event"')
  })

  it('survives engines that reject rules or lack addRoutes entirely', async () => {
    const addRoutes = vi.fn(() => Promise.reject(new TypeError('unsupported')))
    expect(() => runSw({ addRoutes })).not.toThrow()
    await Promise.resolve()
    expect(() => runSw({})).not.toThrow()
  })
})

describe('manifest', () => {
  it('never re-navigates an open app window on relaunch', () => {
    // navigate-existing would send a teacher mid-gradebook back to start_url.
    expect(viteConfig).not.toMatch(/navigate-existing/)
    expect(viteConfig).toMatch(/form_factor: 'narrow'/)
    expect(viteConfig).toMatch(/form_factor: 'wide'/)
  })
})
