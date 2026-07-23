import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import { directionForKey, parseScoreInput, type NavDirection } from './navigation'

export interface ScoreCellProps {
  value: number | null
  maxScore: number
  isSelected: boolean
  isEditing: boolean
  isPending: boolean
  /** When editing was started by typing a character, seed the draft with it. */
  editSeed?: string
  onSelect: () => void
  onStartEdit: (seed?: string) => void
  onCommit: (value: number | null, direction: NavDirection | null) => void
  onCancel: () => void
  onNavigate: (direction: NavDirection) => void
}

function formatScore(value: number | null): string {
  if (value === null) return ''
  return String(value)
}

export function ScoreCell({
  value,
  maxScore,
  isSelected,
  isEditing,
  isPending,
  editSeed,
  onSelect,
  onStartEdit,
  onCommit,
  onCancel,
  onNavigate,
}: ScoreCellProps) {
  const cellRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState('')
  const [invalid, setInvalid] = useState<string | null>(null)

  // Seed the draft when entering edit mode and focus the input.
  useEffect(() => {
    if (isEditing) {
      if (editSeed !== undefined) {
        setDraft(editSeed)
      } else {
        setDraft(formatScore(value))
      }
      setInvalid(null)
      const input = inputRef.current
      if (input) {
        input.focus()
        if (editSeed === undefined) input.select()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing])

  // Move DOM focus to the selected (non-editing) cell so keyboard nav works.
  useEffect(() => {
    if (isSelected && !isEditing) {
      cellRef.current?.focus()
    }
  }, [isSelected, isEditing])

  function tryCommit(direction: NavDirection | null) {
    const result = parseScoreInput(draft, maxScore)
    if (!result.ok) {
      setInvalid(result.reason)
      return false
    }
    setInvalid(null)
    onCommit(result.value, direction)
    return true
  }

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      setInvalid(null)
      onCancel()
      return
    }
    const direction = directionForKey(event.key, event.shiftKey)
    if (direction === 'enter' || direction === 'tab' || direction === 'shift-tab') {
      event.preventDefault()
      tryCommit(direction)
      return
    }
    if (direction === 'up' || direction === 'down') {
      event.preventDefault()
      tryCommit(direction)
    }
    // left/right stay within the text field for editing.
  }

  function handleCellKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === 'F2') {
      event.preventDefault()
      onStartEdit()
      return
    }
    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault()
      onCommit(null, null)
      return
    }
    const direction = directionForKey(event.key, event.shiftKey)
    if (direction) {
      event.preventDefault()
      onNavigate(direction)
      return
    }
    // Typing a number begins editing seeded with that character.
    if (event.key.length === 1 && /[0-9.]/.test(event.key)) {
      event.preventDefault()
      onStartEdit(event.key)
    }
  }

  const display = formatScore(value)

  if (isEditing) {
    return (
      <div className="relative">
        <input
          ref={inputRef}
          inputMode="decimal"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            if (invalid) setInvalid(null)
          }}
          onKeyDown={handleInputKeyDown}
          onBlur={() => {
            // Commit on blur only when valid; otherwise revert silently.
            if (!tryCommit(null)) onCancel()
          }}
          aria-invalid={invalid ? true : undefined}
          className={cn(
            'h-9 w-full min-w-16 rounded-none border-2 bg-(--color-surface-0) px-2 text-right text-sm',
            'text-(--color-ink) focus:outline-none',
            invalid ? 'border-(--color-danger)' : 'border-(--color-accent-400)',
          )}
        />
        {invalid && (
          <span className="absolute left-1 top-full z-10 mt-0.5 whitespace-nowrap rounded-sm bg-(--color-danger) px-1.5 py-0.5 text-[10px] font-medium text-white shadow-(--shadow-pop)">
            {invalid}
          </span>
        )}
      </div>
    )
  }

  return (
    <div
      ref={cellRef}
      role="gridcell"
      tabIndex={isSelected ? 0 : -1}
      onFocus={onSelect}
      onClick={onSelect}
      onDoubleClick={() => onStartEdit()}
      onKeyDown={handleCellKeyDown}
      className={cn(
        'flex h-9 min-w-16 cursor-cell items-center justify-end px-2 text-right text-sm tabular-nums',
        'transition-colors focus:outline-none',
        isSelected
          ? 'bg-(--color-accent-500)/25 ring-2 ring-inset ring-(--color-accent-400)'
          : 'hover:bg-(--color-surface-2)',
        isPending && 'opacity-60',
        display === '' && 'text-(--color-ink-faint)',
      )}
    >
      {display === '' ? '·' : display}
    </div>
  )
}
