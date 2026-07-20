import { useEffect, useState } from 'react'
import { useReducedMotion } from 'motion/react'

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ!<>-_/[]{}=+*#%?'

/**
 * Reveals `text` by swapping each character for a random glyph every tick, then
 * locking left-to-right once a per-character frame threshold is passed. Renders
 * the final text immediately under reduced motion.
 */
export function ScrambleText({
  text,
  className,
  framesPerChar = 2,
  tickMs = 40,
}: {
  text: string
  className?: string
  framesPerChar?: number
  tickMs?: number
}) {
  const reduce = useReducedMotion()
  const [display, setDisplay] = useState(text)

  useEffect(() => {
    if (reduce) {
      setDisplay(text)
      return
    }
    let frame = 0
    const id = setInterval(() => {
      const locked = Math.floor(frame / framesPerChar)
      let out = ''
      for (let i = 0; i < text.length; i++) {
        const ch = text[i]
        out +=
          ch === ' ' || i < locked
            ? ch
            : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
      }
      setDisplay(out)
      frame++
      if (locked >= text.length) clearInterval(id)
    }, tickMs)
    return () => clearInterval(id)
  }, [text, reduce, framesPerChar, tickMs])

  return (
    <span className={className} aria-label={text}>
      {display}
    </span>
  )
}
