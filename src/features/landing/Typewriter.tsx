import { useEffect, useState } from 'react'
import { useReducedMotion } from 'motion/react'

/**
 * Types a phrase, pauses, backspaces, then advances to the next — looping. A
 * blinking accent caret trails the text. Under reduced motion it shows the first
 * phrase statically with no caret.
 */
export function Typewriter({
  phrases,
  className,
}: {
  phrases: readonly string[]
  className?: string
}) {
  const reduce = useReducedMotion()
  const [text, setText] = useState('')

  useEffect(() => {
    if (reduce) return
    let phrase = 0
    let pos = 0
    let deleting = false
    let timer: ReturnType<typeof setTimeout>

    const step = () => {
      const full = phrases[phrase]
      if (!deleting) {
        pos++
        setText(full.slice(0, pos))
        if (pos === full.length) {
          deleting = true
          timer = setTimeout(step, 1600)
          return
        }
        timer = setTimeout(step, 55)
      } else {
        pos--
        setText(full.slice(0, pos))
        if (pos === 0) {
          deleting = false
          phrase = (phrase + 1) % phrases.length
          timer = setTimeout(step, 320)
          return
        }
        timer = setTimeout(step, 28)
      }
    }

    timer = setTimeout(step, 450)
    return () => clearTimeout(timer)
  }, [reduce, phrases])

  if (reduce) {
    return <span className={className}>{phrases[0]}</span>
  }

  return (
    <span className={className}>
      <span aria-hidden="true">{text}</span>
      <span className="caret" aria-hidden="true" />
      <span className="sr-only">{phrases[0]}</span>
    </span>
  )
}
