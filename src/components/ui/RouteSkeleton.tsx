import { Skeleton } from './Skeleton'

/**
 * Router pending state. Deliberately in-flow rather than a fixed overlay: a
 * full-screen spinner on every navigation made in-app tabs read as a jump to a
 * different app.
 */
export function RouteSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-9 w-full max-w-sm" />
      <div className="space-y-2">
        {Array.from({ length: 6 }, (_, row) => (
          <Skeleton key={row} className="h-12 w-full" />
        ))}
      </div>
    </div>
  )
}
