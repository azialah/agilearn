import { Link, useRouterState } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { useClassrooms } from '@/lib/queries/classrooms'

type StaticTeacherRoute =
  | '/teacher/dashboard'
  | '/teacher/classrooms'
  | '/teacher/modules'
  | '/teacher/calendar'
  | '/teacher/analytics'
  | '/teacher/usage'
  | '/teacher/profile'

interface Crumb {
  label: string
  to?: StaticTeacherRoute
  classroomId?: string
}

function BreadcrumbTarget({ crumb }: { crumb: Crumb }) {
  if (crumb.classroomId) {
    return (
      <Link
        to="/teacher/classrooms/$classroomId"
        params={{ classroomId: crumb.classroomId }}
        className="truncate transition-colors hover:text-(--color-ink)"
      >
        {crumb.label}
      </Link>
    )
  }

  if (crumb.to) {
    return (
      <Link to={crumb.to} className="truncate transition-colors hover:text-(--color-ink)">
        {crumb.label}
      </Link>
    )
  }

  return <span className="truncate text-(--color-ink-muted)">{crumb.label}</span>
}

export function TeacherBreadcrumbs() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const { data: classrooms } = useClassrooms()
  if (!pathname.startsWith('/teacher/') || pathname === '/teacher/dashboard') return null
  const classroomId = pathname.match(/\/teacher\/classrooms\/([^/]+)/)?.[1]
  const classroom = classrooms?.find((item) => item.id === classroomId)
  const crumbs: Crumb[] = [{ label: 'Home', to: '/teacher/dashboard' }]
  if (pathname.startsWith('/teacher/classrooms')) {
    crumbs.push({ label: 'Classrooms', to: '/teacher/classrooms' })
    if (classroom)
      crumbs.push({
        label: classroom.cohort_name || classroom.block || classroom.course_name,
        classroomId,
      })
    if (pathname.includes('/grades')) crumbs.push({ label: 'Grades' })
    if (pathname.includes('/attendance')) crumbs.push({ label: 'Attendance' })
    if (pathname.includes('/slideshow')) crumbs.push({ label: 'Slideshow' })
  } else if (pathname.startsWith('/teacher/modules')) {
    crumbs.push({ label: 'Materials', to: '/teacher/modules' })
  } else if (pathname.startsWith('/teacher/calendar')) {
    crumbs.push({ label: 'Calendar', to: '/teacher/calendar' })
  } else if (pathname.startsWith('/teacher/analytics')) {
    crumbs.push({ label: 'Analytics', to: '/teacher/analytics' })
  } else if (pathname.startsWith('/teacher/usage')) {
    crumbs.push({ label: 'Usage', to: '/teacher/usage' })
  } else if (pathname.startsWith('/teacher/profile')) {
    crumbs.push({ label: 'Profile', to: '/teacher/profile' })
  }
  return (
    <nav
      aria-label="Breadcrumb"
      className="mx-auto hidden w-full max-w-6xl items-center gap-1 px-4 pt-4 text-xs text-(--color-ink-faint) lg:flex lg:px-6"
    >
      {crumbs.map((crumb, index) => {
        const isCurrent = index === crumbs.length - 1
        return (
          <span
            key={`${crumb.label}-${index}`}
            className="flex min-w-0 items-center gap-1"
          >
            {index > 0 && <ChevronRight className="size-3 shrink-0" />}
            {isCurrent ? (
              <span className="truncate text-(--color-ink-muted)" aria-current="page">
                {crumb.label}
              </span>
            ) : (
              <BreadcrumbTarget crumb={crumb} />
            )}
          </span>
        )
      })}
    </nav>
  )
}
