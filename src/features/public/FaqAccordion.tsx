import { useRef } from 'react'
import { useReducedMotion } from 'motion/react'

export interface FaqItem {
  q: string
  a: string
}

const OPEN_EASE = 'cubic-bezier(.22, 1, .36, 1)'
const CLOSE_EASE = 'cubic-bezier(.65, 0, .35, 1)'

type AnimatedDetails = HTMLDetailsElement & { _anim?: Animation | null }

/**
 * One-open-at-a-time FAQ built on <details>, so it still works (and is crawlable)
 * without JS. Opening one closes the others; height and the answer animate with
 * the Web Animations API, and snap instantly under reduced motion.
 */
export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const reduce = useReducedMotion() ?? false
  const listRef = useRef<HTMLDivElement>(null)

  function setOpen(d: AnimatedDetails, open: boolean) {
    d.classList.toggle('is-open', open)
    if (reduce || typeof d.animate !== 'function') {
      d.open = open
      return
    }
    const summary = d.querySelector('summary')
    const body = d.querySelector('p')
    d._anim?.cancel()
    const from = d.offsetHeight
    if (open) d.open = true
    const to = open ? d.scrollHeight : (summary?.offsetHeight ?? 0)
    d.style.overflow = 'hidden'
    const anim = d.animate(
      { height: [`${from}px`, `${to}px`] },
      { duration: open ? 440 : 300, easing: open ? OPEN_EASE : CLOSE_EASE },
    )
    body?.animate(
      open
        ? { opacity: [0, 1], transform: ['translateY(-8px)', 'none'] }
        : { opacity: [1, 0], transform: ['none', 'translateY(-4px)'] },
      { duration: open ? 380 : 220, easing: 'ease-out', delay: open ? 60 : 0 },
    )
    d._anim = anim
    anim.onfinish = () => {
      if (!open) d.open = false
      d.style.overflow = ''
      d._anim = null
    }
  }

  function onToggle(e: React.MouseEvent<HTMLElement>) {
    e.preventDefault()
    const d = e.currentTarget.parentElement as AnimatedDetails
    const willOpen = !d.classList.contains('is-open')
    if (willOpen) {
      listRef.current
        ?.querySelectorAll<AnimatedDetails>('details.is-open')
        .forEach((o) => {
          if (o !== d) setOpen(o, false)
        })
    }
    setOpen(d, willOpen)
  }

  return (
    <div ref={listRef} className="b-faq">
      {items.map((item, i) => (
        <details key={item.q} open={i === 0} className={i === 0 ? 'is-open' : undefined}>
          <summary onClick={onToggle}>{item.q}</summary>
          <p>{item.a}</p>
        </details>
      ))}
    </div>
  )
}
