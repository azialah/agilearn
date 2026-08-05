import { useEffect, useState } from 'react'

/**
 * Types each sample out, pauses, deletes it, moves to the next — for example
 * placeholders that hint at more than one valid answer.
 *
 * Pass a module-level array: a fresh array on every render restarts the cycle.
 * Under reduced-motion the first sample is returned as static text.
 */
export function useTypewriter(samples: readonly string[], enabled = true): string {
  const [text, setText] = useState(samples[0] ?? '')

  useEffect(() => {
    const still =
      !enabled ||
      samples.length === 0 ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (still) {
      setText(samples[0] ?? '')
      return
    }

    let sample = 0
    let length = 0
    let deleting = false
    let timer = 0

    function tick() {
      const word = samples[sample % samples.length]
      length += deleting ? -1 : 1
      setText(word.slice(0, length))

      let delay = deleting ? 35 : 85
      if (!deleting && length === word.length) {
        deleting = true
        delay = 1600
      } else if (deleting && length === 0) {
        deleting = false
        sample += 1
        delay = 350
      }
      timer = window.setTimeout(tick, delay)
    }

    setText('')
    timer = window.setTimeout(tick, 400)
    return () => window.clearTimeout(timer)
  }, [samples, enabled])

  return text
}
