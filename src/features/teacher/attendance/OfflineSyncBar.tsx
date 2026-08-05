import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/toast'
import { useOfflineSync } from '@/lib/queries/offlineSync'

/**
 * Shown only when there is something to sync. Attendance marked without a
 * signal is kept on the device and replayed on reconnect; this is where the
 * teacher can see that, push it manually, and settle anything that clashed
 * with a change made elsewhere in the meantime.
 */
export function OfflineSyncBar() {
  const { pending, progress, conflicts, flushing, flush, keepMine, discardConflict } =
    useOfflineSync()
  const { toast } = useToast()

  if (pending === 0 && conflicts.length === 0) return null

  async function resolve(
    action: 'mine' | 'theirs',
    conflict: (typeof conflicts)[number],
  ) {
    try {
      if (action === 'mine') await keepMine(conflict)
      else await discardConflict(conflict.write.id)
    } catch (error) {
      toast({
        title: 'Could not settle that change',
        description: error instanceof Error ? error.message : undefined,
        tone: 'error',
      })
    }
  }

  return (
    <section
      aria-label="Offline changes"
      className="space-y-3 rounded-2xl border border-(--color-warning)/40 bg-(--color-warning)/10 p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-(--color-ink)">
            {pending} {pending === 1 ? 'change is' : 'changes are'} saved on this device
          </p>
          <p className="text-sm text-(--color-ink-muted)">
            They upload automatically when you are back online.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          loading={flushing}
          onClick={() => void flush()}
        >
          Sync now
        </Button>
      </div>

      {progress && (
        <div>
          <p className="text-xs text-(--color-ink-muted)">
            {progress.done} of {progress.total} changes synced
          </p>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={progress.total}
            aria-valuenow={progress.done}
            aria-label="Sync progress"
            className="mt-1 h-1.5 overflow-hidden rounded-full bg-(--color-surface-3)"
          >
            <div
              className="h-full rounded-full bg-(--color-accent-400) transition-[width]"
              style={{ width: `${(progress.done / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {conflicts.length > 0 && (
        <div className="space-y-2 border-t border-(--color-warning)/30 pt-3">
          <p className="text-sm font-medium text-(--color-ink)">
            Changed elsewhere while you were offline
          </p>
          {conflicts.map((conflict) => (
            <div
              key={conflict.write.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-(--color-surface-1) px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-(--color-ink)">
                  {conflict.write.label}
                </p>
                <p className="text-xs text-(--color-ink-muted)">
                  Yours: {String(conflict.write.payload.status ?? '—')} · Theirs:{' '}
                  {String(conflict.theirs?.status ?? '—')}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void resolve('theirs', conflict)}
                >
                  Keep theirs
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void resolve('mine', conflict)}
                >
                  Keep mine
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
