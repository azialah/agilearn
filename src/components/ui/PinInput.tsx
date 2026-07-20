import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react'
import { cn } from '@/lib/cn'

export interface PinInputProps {
  value: string
  onChange: (value: string) => void
  length?: number
  disabled?: boolean
  autoFocus?: boolean
  onComplete?: (value: string) => void
  /** Base label; each box gets "<label> digit N". */
  label?: string
}

/** Segmented numeric code entry (e.g. an email one-time code). */
export function PinInput({
  value,
  onChange,
  length = 6,
  disabled,
  autoFocus,
  onComplete,
  label = 'Verification code',
}: PinInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const digits = Array.from({ length }, (_, i) => value[i] ?? '')

  const focusAt = (i: number) =>
    refs.current[Math.max(0, Math.min(i, length - 1))]?.focus()

  const pop = (i: number) => {
    const el = refs.current[i]
    if (!el) return
    el.classList.add('pop')
    setTimeout(() => el.classList.remove('pop'), 160)
  }

  const commit = (arr: string[]) => {
    const next = arr.join('')
    onChange(next)
    if (next.length === length) onComplete?.(next)
  }

  const fillFrom = (start: number, raw: string) => {
    const clean = raw.replace(/\D/g, '')
    if (!clean) return
    const arr = [...digits]
    let i = start
    for (const c of clean) {
      if (i >= length) break
      arr[i] = c
      pop(i)
      i++
    }
    commit(arr)
    focusAt(i)
  }

  const handleKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      const arr = [...digits]
      if (arr[i]) {
        arr[i] = ''
        commit(arr)
      } else if (i > 0) {
        arr[i - 1] = ''
        commit(arr)
        focusAt(i - 1)
      }
    } else if (e.key === 'ArrowLeft') {
      focusAt(i - 1)
    } else if (e.key === 'ArrowRight') {
      focusAt(i + 1)
    }
  }

  const handlePaste = (i: number, e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    fillFrom(i, e.clipboardData.getData('text'))
  }

  return (
    <div className="flex gap-2" role="group" aria-label={label}>
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          value={digit}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          inputMode="numeric"
          maxLength={1}
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          aria-label={`${label} digit ${i + 1}`}
          onChange={(e) => fillFrom(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={(e) => handlePaste(i, e)}
          className={cn(
            'pin-box rounded-[var(--radius-md)] border border-[var(--color-border)]',
            'bg-[var(--color-surface-1)] font-[family-name:var(--font-mono)] text-lg text-[var(--color-ink)]',
            'disabled:cursor-not-allowed disabled:opacity-50',
            digit && 'filled',
          )}
        />
      ))}
    </div>
  )
}
