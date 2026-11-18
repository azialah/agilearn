import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { computeFinalGrade } from '@/lib/grading'
import { RollingNumber } from './bits'

type EngineKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'

/** Keycap weights demo. The final uses computeFinalGrade, same as the gradebook. */
export function WeightsEngine({ openPage = true }: { openPage?: boolean }) {
  const [w, setW] = useState(40)
  const [lab, setLab] = useState(91)
  const [down, setDown] = useState<EngineKey | null>(null)
  const lec = 84
  const armed = useRef(false)
  const final = computeFinalGrade(lec, lab, w / 100, (100 - w) / 100) ?? 0

  function press(k: string): boolean {
    if (k === 'ArrowLeft') setW((v) => Math.max(0, v - 5))
    else if (k === 'ArrowRight') setW((v) => Math.min(100, v + 5))
    else if (k === 'ArrowUp') setLab((v) => Math.min(100, v + 1))
    else if (k === 'ArrowDown') setLab((v) => Math.max(0, v - 1))
    else return false
    setDown(k)
    return true
  }

  useEffect(() => {
    if (!down) return
    const t = window.setTimeout(() => setDown(null), 140)
    return () => window.clearTimeout(t)
  }, [down])

  // Arrow keys drive the demo only while the pointer (or focus) is on the panel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!armed.current) return
      const t = e.target
      if (t instanceof Element && t.closest('input, textarea, select')) return
      if (press(e.key)) e.preventDefault()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const keyProps = (k: EngineKey, cls: string, label: string, glyph: string) => (
    <button
      type="button"
      className={`c-key ${cls}${down === k ? ' down' : ''}`}
      aria-label={label}
      onClick={() => press(k)}
    >
      {glyph}
    </button>
  )

  return (
    <section className="c-engine" id="weights" aria-label="Grade weights">
      <div className="c-wrap c-eng">
        <div>
          <span className="eyebrow">Weighted the way your syllabus is</span>
          <div className="c-split c-mt-14">
            <RollingNumber value={String(w)} />
            <span className="sl">/</span>
            <RollingNumber value={String(100 - w)} />
          </div>
          <p className="sr" aria-live="polite">
            Lecture {w} percent, laboratory {100 - w} percent. Final grade{' '}
            {final.toFixed(2)}.
          </p>
          <div className="c-split-lab">
            <span>Lecture</span>
            <span>Laboratory</span>
          </div>
          {openPage && (
            <Link to="/grade-weights" className="c-open">
              Open page <ArrowRight className="ico" aria-hidden="true" />
            </Link>
          )}
        </div>
        <div
          className="c-eng-panel"
          onPointerEnter={() => (armed.current = true)}
          onPointerLeave={() => (armed.current = false)}
          onFocus={() => (armed.current = true)}
          onBlur={() => (armed.current = false)}
        >
          <div className="c-keys" role="group" aria-label="Adjust weights and lab score">
            {keyProps('ArrowUp', 'up-k', 'Raise lab score', '↑')}
            {keyProps('ArrowLeft', 'left-k', 'Lower lecture weight', '←')}
            {keyProps('ArrowDown', 'down-k', 'Lower lab score', '↓')}
            {keyProps('ArrowRight', 'right-k', 'Raise lecture weight', '→')}
          </div>
          <p className="c-hint">
            Hover here and press <kbd>←</kbd>
            <kbd>→</kbd> to shift the split, <kbd>↑</kbd>
            <kbd>↓</kbd> to change the lab score. Or tap the keys.
          </p>
          <div className="c-final">
            <small>Ramos, K. · final grade</small>
            <RollingNumber value={final.toFixed(2)} />
            <span data-formula>
              {(w / 100).toFixed(2)} × {lec} + {((100 - w) / 100).toFixed(2)} × {lab}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
