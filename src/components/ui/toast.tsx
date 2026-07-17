import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { cn } from '@/lib/cn'

export type ToastTone = 'default' | 'success' | 'error'

interface ToastItem {
  id: number
  title: string
  description?: string
  tone: ToastTone
}

interface ToastContextValue {
  toast: (input: { title: string; description?: string; tone?: ToastTone }) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let counter = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback<ToastContextValue['toast']>(
    ({ title, description, tone = 'default' }) => {
      const id = ++counter
      setItems((current) => [...current, { id, title, description, tone }])
      setTimeout(() => dismiss(id), 4500)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            role="status"
            className={cn(
              'pointer-events-auto rounded-[var(--radius-md)] border p-4 shadow-[var(--shadow-pop)]',
              'bg-[var(--color-surface-2)]',
              item.tone === 'success' && 'border-[var(--color-success)]/40',
              item.tone === 'error' && 'border-[var(--color-danger)]/40',
              item.tone === 'default' && 'border-[var(--color-border)]',
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-[var(--color-ink)]">
                  {item.title}
                </p>
                {item.description && (
                  <p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">
                    {item.description}
                  </p>
                )}
              </div>
              <button
                aria-label="Dismiss"
                className="text-[var(--color-ink-faint)] hover:text-[var(--color-ink)]"
                onClick={() => dismiss(item.id)}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
