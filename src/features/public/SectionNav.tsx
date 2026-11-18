import { useState, type ReactNode } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useReducedMotion } from 'motion/react'
import { cn } from '@/lib/cn'
import { scrollToId, useScrollFrame } from './fx'

/** The id of the last section whose top has passed ~a third of the viewport. */
export function useSectionSpy(ids: readonly string[]) {
  const [active, setActive] = useState<string | null>(null)
  useScrollFrame(() => {
    let a: string | null = null
    for (const id of ids) {
      const el = document.getElementById(id)
      if (el && el.getBoundingClientRect().top <= window.innerHeight * 0.32) a = id
    }
    setActive(a)
  })
  return active
}

/** In-page jump (feature chips, legal table of contents): smooth scroll + shareable hash. */
export function JumpLink({
  id,
  active,
  children,
}: {
  id: string
  active: string | null
  children: ReactNode
}) {
  const reduce = useReducedMotion() ?? false
  const router = useRouter()
  return (
    <a
      href={`#${id}`}
      className={cn(active === id && 'on')}
      aria-current={active === id ? 'location' : undefined}
      onClick={(e) => {
        e.preventDefault()
        scrollToId(id, reduce, 130)
        const { pathname, searchStr } = router.state.location
        // Through the router's history so its location (and hash) stay in sync.
        router.history.replace(`${pathname}${searchStr}#${id}`)
      }}
    >
      {children}
    </a>
  )
}
