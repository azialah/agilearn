import { useState, type ReactNode } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/cn'
import { useUpdateClassroom } from '@/lib/queries/classrooms'
import {
  CLASSROOM_COLORS,
  CLASSROOM_COLOR_CLASSES,
  classroomColor,
} from '@/lib/classroomColor'
import type { Classroom } from '@/types/domain'

/**
 * Right-click a classroom card to recolour it, like a folder in a file drive.
 *
 * Right-click is mouse-only, so `children` is wrapped alongside a real menu
 * button: the same menu opens from the keyboard and from touch. The invisible
 * trigger is moved to the pointer so the menu appears under the cursor —
 * Radix anchors to its trigger, and this project has no ContextMenu primitive.
 */
export function ClassroomColorMenu({
  classroom,
  children,
  button,
}: {
  classroom: Classroom
  children: ReactNode
  /** Rendered as the visible, focusable way into the same menu. */
  button: (props: { onClick: () => void }) => ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null)
  const update = useUpdateClassroom()
  const { toast } = useToast()
  const current = classroomColor(classroom)

  async function apply(color: string | null) {
    setOpen(false)
    try {
      await update.mutateAsync({ id: classroom.id, patch: { color } })
    } catch (error) {
      toast({
        title: 'Could not change the colour',
        description: error instanceof Error ? error.message : undefined,
        tone: 'error',
      })
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <div
        className="relative"
        onContextMenu={(event) => {
          event.preventDefault()
          const box = event.currentTarget.getBoundingClientRect()
          setPoint({ x: event.clientX - box.left, y: event.clientY - box.top })
          setOpen(true)
        }}
      >
        {children}
        {button({
          onClick: () => {
            setPoint(null)
            setOpen(true)
          },
        })}
        <DropdownMenuTrigger asChild>
          <span
            aria-hidden
            className="pointer-events-none absolute size-0"
            style={point ? { left: point.x, top: point.y } : { left: 0, top: 0 }}
          />
        </DropdownMenuTrigger>
      </div>
      <DropdownMenuContent align="start" className="w-64 p-2">
        <DropdownMenuLabel>Classroom colour</DropdownMenuLabel>
        <div className="flex flex-wrap gap-2 p-1">
          <button
            type="button"
            aria-pressed={!classroom.color}
            onClick={() => void apply(null)}
            className={cn(
              'h-9 rounded-full border px-3 text-xs font-medium',
              classroom.color
                ? 'border-(--color-border) text-(--color-ink-muted)'
                : 'border-(--color-accent-400) text-(--color-ink)',
            )}
          >
            Auto
          </button>
          {CLASSROOM_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={color}
              aria-pressed={classroom.color === color}
              onClick={() => void apply(color)}
              className={cn(
                'size-9 rounded-full border-2 transition-transform',
                CLASSROOM_COLOR_CLASSES[color].dot,
                classroom.color === color
                  ? 'scale-110 border-(--color-ink)'
                  : 'border-transparent',
              )}
            />
          ))}
        </div>
        <p className="px-2 pb-1 pt-2 text-xs text-(--color-ink-faint)">
          Currently {classroom.color ? current : `${current} (auto)`}.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
