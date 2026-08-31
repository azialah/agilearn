import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/toast'
import { useOfflineSync } from '@/lib/queries/offlineSync'
import { useLocale } from '@/lib/locale'

/**
 * Shown only when there is something to sync. Attendance marked without a
 * signal is kept on the device and replayed on reconnect; this is where the
 * teacher can see that, push it manually, and settle anything that clashed
 * with a change made elsewhere in the meantime.
 */
/** The one field a teacher is actually choosing between. Attendance rows
 *  differ by status, score rows by the mark — showing "status" for a queued
 *  grade printed an em dash and made the choice meaningless. */
function describeValue(
  table: string,
  row: Record<string, unknown> | null | undefined,
): string {
  if (!row) return '—'
  const value = table === 'scores' ? row.score : row.status
  return value === null || value === undefined ? '—' : String(value)
}

export function OfflineSyncBar() {
  const { pending, progress, conflicts, flushing, flush, keepMine, discardConflict } =
    useOfflineSync()
  const { toast } = useToast()
  const { t } = useLocale()
  // Resolving is a round trip; without this a double-tap fires it twice.
  const [resolving, setResolving] = useState<string | null>(null)

  if (pending === 0 && conflicts.length === 0) return null

  async function resolve(
    action: 'mine' | 'theirs',
    conflict: (typeof conflicts)[number],
  ) {
    if (resolving) return
    setResolving(conflict.write.id)
    try {
      if (action === 'mine') await keepMine(conflict)
      else await discardConflict(conflict.write.id)
    } catch (error) {
      toast({
        title: t('attendanceSyncResolveError'),
        description: error instanceof Error ? error.message : undefined,
        tone: 'error',
      })
    } finally {
      setResolving(null)
    }
  }

  return (
    <section
      aria-label={t('attendanceOfflineChangesLabel')}
      className="space-y-3 rounded-2xl border border-(--color-warning)/40 bg-(--color-warning)/10 p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-(--color-ink)">
            {t(
              pending === 1
                ? 'attendanceSyncPendingSingular'
                : 'attendanceSyncPendingPlural',
              {
                n: pending,
              },
            )}
          </p>
          <p className="text-sm text-(--color-ink-muted)">
            {t('attendanceSyncAutoUpload')}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          loading={flushing}
          onClick={() => void flush()}
        >
          {t('attendanceSyncNow')}
        </Button>
      </div>

      {progress && (
        <div>
          <p className="text-xs text-(--color-ink-muted)">
            {t('attendanceSyncProgressText', {
              done: progress.done,
              total: progress.total,
            })}
          </p>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={progress.total}
            aria-valuenow={progress.done}
            aria-label={t('attendanceSyncProgressLabel')}
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
            {t('attendanceSyncConflictHeading')}
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
                  {t('attendanceSyncYoursLabel')}:{' '}
                  {describeValue(conflict.write.table, conflict.write.payload)} ·{' '}
                  {t('attendanceSyncTheirsLabel')}:{' '}
                  {describeValue(conflict.write.table, conflict.theirs)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={resolving !== null}
                  onClick={() => void resolve('theirs', conflict)}
                >
                  {t('attendanceSyncKeepTheirs')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  loading={resolving === conflict.write.id}
                  disabled={resolving !== null}
                  onClick={() => void resolve('mine', conflict)}
                >
                  {t('attendanceSyncKeepMine')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
