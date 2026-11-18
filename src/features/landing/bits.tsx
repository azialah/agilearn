import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { animate, useInView, useReducedMotion } from 'motion/react'

/** Inline CSS custom properties (data-driven values such as a bar's fill). */
export type CSSVars = CSSProperties & Record<`--${string}`, string | number>

/** Counts from 0 to `to` once it scrolls into view (instant under reduced motion). */
export function CountUp({ to, suffix }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.4 })
  const reduce = useReducedMotion()
  const [n, setN] = useState(0)

  useEffect(() => {
    if (!inView) return
    if (reduce) {
      setN(to)
      return
    }
    const controls = animate(0, to, {
      duration: 1.2,
      ease: [0.33, 1, 0.68, 1],
      onUpdate: (v) => setN(Math.round(v)),
    })
    return () => controls.stop()
  }, [inView, reduce, to])

  return (
    <b ref={ref}>
      {n}
      {suffix && <sup>{suffix}</sup>}
    </b>
  )
}

/** 18-week strip with the weeks of one grading stop lit. */
export function Weeks({ from, to }: { from: number; to: number }) {
  return (
    <div className="c-weeks" aria-hidden="true">
      {Array.from({ length: 18 }, (_, i) => (
        <i key={i} className={i + 1 >= from && i + 1 <= to ? 'on' : undefined} />
      ))}
    </div>
  )
}

/** Odometer-style number: each digit is a 0–9 column that slides to its value. */
export function RollingNumber({ value }: { value: string }) {
  return (
    <span className="c-roll" aria-hidden="true">
      {value.split('').map((ch, i) => {
        if (!/\d/.test(ch)) {
          return (
            <span key={`s${i}`} className="rs">
              {ch}
            </span>
          )
        }
        return (
          <span key={`d${value.length - i}`} className="rd">
            <span
              className="rc"
              style={{ transform: `translateY(${-Number(ch) * 10}%)` }}
            >
              {DIGITS.map((n) => (
                <span key={n}>{n}</span>
              ))}
            </span>
          </span>
        )
      })}
    </span>
  )
}
const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

/** One split-flap tile: flips, swaps its letter mid-flip. */
function Tile({ ch, delay, reduce }: { ch: string; delay: number; reduce: boolean }) {
  const [shown, setShown] = useState(ch)
  const [flip, setFlip] = useState(0)

  useEffect(() => {
    if (ch === shown) return
    if (reduce) {
      setShown(ch)
      return
    }
    const t1 = window.setTimeout(() => setFlip((f) => f + 1), delay)
    const t2 = window.setTimeout(() => setShown(ch), delay + 160)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [ch, shown, delay, reduce])

  return (
    <span key={flip} className={flip ? 'c-tile flip' : 'c-tile'}>
      {shown}
    </span>
  )
}

/** Split-flap headline word (decorative; the real h1 text is screen-reader only). */
export function SplitFlap({ words }: { words: string[] }) {
  const reduce = useReducedMotion() ?? false
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref)
  const [i, setI] = useState(0)
  const width = Math.max(...words.map((w) => w.length))

  useEffect(() => {
    if (reduce || !inView) return
    const id = window.setInterval(() => {
      if (!document.hidden) setI((n) => (n + 1) % words.length)
    }, 2600)
    return () => window.clearInterval(id)
  }, [reduce, inView, words.length])

  const word = words[i] ?? ''
  return (
    <span ref={ref} className="c-board">
      {Array.from({ length: width }, (_, k) => (
        <Tile key={k} ch={word[k] ?? ''} delay={k * 70} reduce={reduce} />
      ))}
    </span>
  )
}
