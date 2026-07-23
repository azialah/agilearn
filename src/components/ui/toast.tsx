import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { maybeNotifyNative } from '@/lib/nativeNotify'

export type ToastTone = 'default' | 'success' | 'error'

interface ToastItem {
  id: number
  title: string
  description?: string
  tone: ToastTone
}

interface ToastInput {
  title: string
  description?: string
  tone?: ToastTone
  /** Also fire a native OS notification (Notification API) alongside the in-app toast. */
  native?: boolean
}

interface ToastContextValue {
  toast: (input: ToastInput) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let counter = 0
const DURATION_MS = 4500

const TONE_ICON = {
  default: Info,
  success: CheckCircle2,
  error: AlertCircle,
} as const

const TONE_ICON_CLASS: Record<ToastTone, string> = {
  default: 'text-(--color-accent-350) bg-(--color-accent-500)/15',
  success: 'text-(--color-success) bg-(--color-success)/15',
  error: 'text-(--color-danger) bg-(--color-danger)/15',
}

/** True at lg+ (≥1024px), reacting to viewport changes. */
function useIsLargeScreen() {
  const [large, setLarge] = useState(
    typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches,
  )
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)')
    const sync = () => setLarge(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])
  return large
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const reduce = useReducedMotion()
  const isLarge = useIsLargeScreen()

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback<ToastContextValue['toast']>(
    ({ title, description, tone = 'default', native }) => {
      const id = ++counter
      setItems((current) => [...current, { id, title, description, tone }])
      setTimeout(() => dismiss(id), DURATION_MS)
      if (native) maybeNotifyNative(title, description)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* xs–md: top-center banner sliding down from the top (iOS-style).
          lg+: top-right corner stack sliding in from the right (Sonner-style). */}
      <div
        className={cn(
          'pointer-events-none fixed inset-x-0 top-4 z-100 flex flex-col items-center gap-2 px-4',
          'lg:inset-x-auto lg:right-4 lg:items-end lg:px-0',
        )}
      >
        <AnimatePresence>
          {items.map((item) => {
            const Icon = TONE_ICON[item.tone]
            return (
              <motion.div
                key={item.id}
                role="status"
                layout
                initial={
                  reduce
                    ? { opacity: 0 }
                    : isLarge
                      ? { opacity: 0, x: 32, scale: 0.98 }
                      : { opacity: 0, y: -16, scale: 0.96 }
                }
                animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                exit={
                  reduce
                    ? { opacity: 0 }
                    : isLarge
                      ? { opacity: 0, x: 32, scale: 0.98 }
                      : { opacity: 0, y: -8, scale: 0.96 }
                }
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="pointer-events-auto w-full max-w-sm overflow-hidden rounded-(--radius-xl) border border-(--color-border) bg-(--color-surface-1)/95 shadow-(--shadow-pop) backdrop-blur-md"
              >
                <div className="flex items-start gap-3 p-4">
                  <span
                    className={cn(
                      'flex size-8 shrink-0 items-center justify-center rounded-full',
                      TONE_ICON_CLASS[item.tone],
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-sm font-medium text-(--color-ink)">
                      {item.title}
                    </p>
                    {item.description && (
                      <p className="mt-0.5 text-sm text-(--color-ink-muted)">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <button
                    aria-label="Dismiss"
                    onClick={() => dismiss(item.id)}
                    className="shrink-0 rounded-full p-1 text-(--color-ink-faint) transition-colors hover:bg-(--color-surface-2) hover:text-(--color-ink)"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                {!reduce && (
                  <motion.div
                    aria-hidden
                    className="h-[3px] origin-left bg-(--color-accent-400)/50"
                    initial={{ scaleX: 1 }}
                    animate={{ scaleX: 0 }}
                    transition={{ duration: DURATION_MS / 1000, ease: 'linear' }}
                  />
                )}
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
