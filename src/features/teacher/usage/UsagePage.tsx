import { HardDrive, TriangleAlert } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { useStorageUsage } from '@/lib/queries/calendar'
import { useModules } from '@/lib/queries/modules'

function formatBytes(value: number) {
  return value >= 1024 * 1024
    ? `${(value / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(0, value / 1024).toFixed(1)} KB`
}

export function UsagePage() {
  const usage = useStorageUsage()
  const { data: modules = [] } = useModules()
  const used = usage.data?.used_bytes ?? 0
  const limit = usage.data?.quota_bytes ?? 524288000
  const percent = Math.min(100, Math.round((used / limit) * 100))
  const largest = [...modules].sort((a, b) => b.file_size - a.file_size).slice(0, 5)
  const warning =
    percent >= 95
      ? 'Storage is nearly full. Delete or archive files before uploading.'
      : percent >= 80
        ? 'Storage is approaching its limit. Review your largest files.'
        : null
  return (
    <div className="space-y-6">
      <PageHeader
        title="Usage"
        description="Private teaching-material storage for your account."
      />
      <Card className="overflow-hidden rounded-4xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <HardDrive className="size-5 text-(--color-accent-350)" />
            <p className="mt-5 text-4xl font-semibold">{formatBytes(used)}</p>
            <p className="mt-1 text-sm text-(--color-ink-muted)">
              of {formatBytes(limit)} available
            </p>
          </div>
          <span className="rounded-full bg-(--color-surface-2) px-3 py-1 text-sm font-medium">
            {percent}% used
          </span>
        </div>
        <div className="mt-6 h-3 overflow-hidden rounded-full bg-(--color-surface-3)">
          <div
            className={
              percent >= 95
                ? 'h-full bg-red-500'
                : percent >= 80
                  ? 'h-full bg-amber-500'
                  : 'h-full bg-linear-to-r from-(--color-accent-350) to-(--color-accent-500)'
            }
            style={{ width: `${percent}%` }}
          />
        </div>
        {warning && (
          <p className="mt-4 flex gap-2 rounded-xl bg-(--color-surface-2) p-3 text-sm text-(--color-ink-muted)">
            <TriangleAlert className="size-4 shrink-0 text-amber-500" />
            {warning}
          </p>
        )}
      </Card>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="rounded-4xl p-6">
          <h2 className="font-semibold">Largest files</h2>
          <div className="mt-4 space-y-3">
            {largest.length ? (
              largest.map((module) => (
                <div
                  key={module.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-(--color-surface-2) px-3 py-2"
                >
                  <span className="truncate text-sm">{module.title}</span>
                  <span className="shrink-0 text-xs text-(--color-ink-muted)">
                    {formatBytes(module.file_size)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-(--color-ink-muted)">
                Your uploaded module files will appear here.
              </p>
            )}
          </div>
        </Card>
        <Card className="rounded-4xl p-6">
          <h2 className="font-semibold">How storage works</h2>
          <p className="mt-3 text-sm leading-6 text-(--color-ink-muted)">
            Each teacher has 500 MB of private module storage. The limit is enforced when
            a file uploads, even if several browser tabs upload at the same time.
          </p>
          <p className="mt-3 font-(family-name:--font-calligraphy) text-xl text-(--color-accent-350)">
            Keep only what supports this season
          </p>
        </Card>
      </div>
    </div>
  )
}
