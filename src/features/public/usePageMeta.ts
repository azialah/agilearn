import { useEffect } from 'react'
import { SITE_URL } from './site'

const DEFAULT_TITLE = 'Agilearn'

/** Sets a meta tag and returns a function that puts back what was there. */
function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  const created = !el
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  const prev = el.content
  el.content = content
  const tag = el
  return () => (created ? tag.remove() : (tag.content = prev))
}

/**
 * Per-page title, description, canonical and share tags. index.html carries the
 * landing defaults for crawlers that don't run JS; this updates the same tags in
 * place (no duplicates) for each public page.
 */
export function usePageMeta(title: string, description: string, path: string) {
  useEffect(() => {
    const url = SITE_URL + (path === '/' ? '/' : path)
    document.title = title
    const restore = [
      upsertMeta('name', 'description', description),
      upsertMeta('property', 'og:title', title),
      upsertMeta('property', 'og:description', description),
      upsertMeta('property', 'og:url', url),
      upsertMeta('name', 'twitter:title', title),
      upsertMeta('name', 'twitter:description', description),
    ]
    // Canonical exists only while a public page is mounted, so app routes
    // (e.g. /teacher/signup) never claim to be a copy of another URL.
    const canonical = document.createElement('link')
    canonical.rel = 'canonical'
    canonical.href = url
    document.head.querySelectorAll('link[rel="canonical"]').forEach((l) => l.remove())
    document.head.appendChild(canonical)
    return () => {
      document.title = DEFAULT_TITLE
      restore.forEach((r) => r())
      canonical.remove()
    }
  }, [title, description, path])
}
