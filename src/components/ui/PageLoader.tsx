import { Logo } from './Logo'

/** Full-viewport loading state — shown while a lazy route chunk loads. */
export function PageLoader() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-(--color-splash-bg)">
      <Logo size={9} />
    </div>
  )
}
