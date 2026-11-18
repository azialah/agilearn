/** Shared data for the public marketing surface (landing + public pages). */

export const SITE_URL = 'https://agilearn.vercel.app'

export const DEVELOPER = {
  name: 'John Neo Lopez',
  portfolio: 'https://johnneo-portfolio.netlify.app/',
  linkedin: 'https://www.linkedin.com/in/johnneomlpz',
} as const

/** Shown only on /about (with a Copy button), never in the footer. */
export const CONTACT_EMAIL = 'johnneomanuel@gmail.com'

/** Landing nav: in-page sections, highlighted by scroll-spy. */
export const LANDING_SECTIONS = [
  { id: 'how-it-works', label: 'How it works' },
  { id: 'features', label: 'Features' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'faq', label: 'FAQ' },
] as const

/** Public-page nav: real routes. */
export const PAGE_LINKS = [
  { to: '/how-it-works', label: 'How it works' },
  { to: '/features', label: 'Features' },
  { to: '/about', label: 'About' },
  { to: '/privacy', label: 'Privacy' },
] as const

export type PublicPath =
  | '/'
  | '/how-it-works'
  | '/features'
  | '/about'
  | '/privacy'
  | '/terms'
  | '/login'
  | '/teacher/signup'

export interface FooterLink {
  label: string
  to: PublicPath
  hash?: string
}

export const FOOTER_COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: 'Product',
    links: [
      { label: 'How it works', to: '/how-it-works' },
      { label: 'Grade weights', to: '/how-it-works', hash: 'weights' },
      { label: 'All features', to: '/features' },
      { label: 'Privacy and security', to: '/privacy', hash: 'p-protect' },
      { label: 'FAQ', to: '/about', hash: 'faq' },
    ],
  },
  {
    title: 'For teachers',
    links: [
      { label: 'Start as a teacher', to: '/teacher/signup' },
      { label: 'Sign in', to: '/login' },
      { label: 'Request access for your school', to: '/', hash: 'get-started' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About Agilearn', to: '/about' },
      { label: 'The developer', to: '/about', hash: 'developer' },
      { label: 'Privacy Notice', to: '/privacy' },
      { label: 'Terms of Use', to: '/terms' },
    ],
  },
]

/** Bare domain: labels of letters/digits/hyphens separated by dots. */
export const DOMAIN_RE =
  /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i

/** The part of an email after the last '@', lower-cased, if it's a valid domain. */
export function emailDomain(email: string): string | null {
  const v = email.trim().toLowerCase()
  const at = v.lastIndexOf('@')
  if (at <= 0) return null
  const domain = v.slice(at + 1)
  return DOMAIN_RE.test(domain) ? domain : null
}
