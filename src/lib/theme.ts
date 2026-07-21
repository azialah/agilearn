import { useCallback, useEffect, useState } from 'react'

export type Theme = 'system' | 'light' | 'white' | 'dark'

const STORAGE_KEY = 'agilearn-theme'
const META_DARK = '#17110d'
const META_LIGHT = '#faf5ec'

export function getStoredTheme(): Theme {
  const v = localStorage.getItem(STORAGE_KEY)
  return v === 'light' || v === 'white' || v === 'dark' || v === 'system' ? v : 'system'
}

function prefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/** Whether the given preference resolves to a dark presentation right now. */
export function resolvesDark(theme: Theme): boolean {
  return theme === 'dark' || (theme === 'system' && prefersDark())
}

/** Reflect a theme onto the document (dark class + theme-color meta). */
export function applyTheme(theme: Theme): void {
  const dark = resolvesDark(theme)
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.classList.toggle('calm-white', theme === 'white')
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', dark ? META_DARK : META_LIGHT)
}

export function setTheme(theme: Theme): void {
  localStorage.setItem(STORAGE_KEY, theme)
  applyTheme(theme)
}

/** Current preference + a setter; re-applies on system changes while on `system`. */
export function useTheme(): { theme: Theme; setTheme: (t: Theme) => void } {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme)

  useEffect(() => {
    applyTheme(theme)
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme])

  const update = useCallback((t: Theme) => {
    setTheme(t)
    setThemeState(t)
  }, [])

  return { theme, setTheme: update }
}
