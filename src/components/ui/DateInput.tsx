import { forwardRef, useImperativeHandle, useRef } from 'react'
import { CalendarDays } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Input, type InputProps } from '@/components/ui/Input'

/**
 * A date field that looks like the rest of the design system while staying a
 * native `<input type="date">` — so `min`/`max`/`required` keep working and
 * phones still get the OS date picker instead of a re-implemented calendar.
 *
 * The browser's own indicator is hidden and replaced with our calendar glyph,
 * which opens the same picker via `showPicker()`.
 */
export const DateInput = forwardRef<HTMLInputElement, Omit<InputProps, 'type'>>(
  ({ className, disabled, ...props }, ref) => {
    const inner = useRef<HTMLInputElement>(null)
    useImperativeHandle(ref, () => inner.current as HTMLInputElement)

    return (
      <div className="relative">
        <Input
          ref={inner}
          type="date"
          disabled={disabled}
          className={cn(
            'pr-10 [&::-webkit-calendar-picker-indicator]:opacity-0',
            className,
          )}
          {...props}
        />
        {/* Redundant affordance: keyboard users type into the input directly,
            so this is taken out of the tab order and hidden from AT rather
            than given a name that would announce a duplicate control (§9). */}
        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          disabled={disabled}
          onClick={() => inner.current?.showPicker?.()}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-(--color-ink-faint) transition-colors hover:text-(--color-ink) disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CalendarDays className="size-4" />
        </button>
      </div>
    )
  },
)
DateInput.displayName = 'DateInput'
