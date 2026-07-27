import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { PageHeader } from '@/components/layout/PageHeader'
import { Table, TableContainer, TBody, TD, TH, THead, TR } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { DateInput } from '@/components/ui/DateInput'
import { useProfile, useProfiles } from '@/lib/queries/profiles'
import { useAuditLog, type AuditLogRow } from '@/lib/queries/auditLog'

const selectClassName =
  'h-9 rounded-md border border-(--color-border) bg-(--color-surface-1) ' +
  'px-3 text-base md:text-sm text-(--color-ink) transition-colors ' +
  'focus-visible:border-(--color-accent-400) focus-visible:outline-none'

const PAGE_SIZE = 50

function formatTimestamp(value: string): string {
  // value is a timestamptz already in UTC; never append a hard-coded 'Z'.
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function actorLabel(row: AuditLogRow): string {
  // actor_id is nulled out if the profile is later deleted (on delete set null),
  // so the audit row survives even when the actor no longer exists.
  return row.actor?.full_name || row.actor?.email || row.actor_id || 'Deleted user'
}

function shortId(id: string): string {
  return id.slice(0, 8)
}

export function AuditLogPage() {
  const navigate = useNavigate()
  const { data: profile, isLoading: profileLoading } = useProfile()
  const isAdmin = profile?.role === 'admin'

  useEffect(() => {
    if (!profileLoading && profile && !isAdmin) {
      navigate({ to: '/teacher/dashboard' })
    }
  }, [profileLoading, profile, isAdmin, navigate])

  const [limit, setLimit] = useState(PAGE_SIZE)
  const [actorId, setActorId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const { data: profiles } = useProfiles()
  const { data: entries, isLoading } = useAuditLog({ limit, actorId, from, to })
  const hasActiveFilters = !!actorId || !!from || !!to

  if (profileLoading || !isAdmin) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    )
  }

  const hasMore = (entries ?? []).length === limit

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit log"
        description="Recent role, roster, and grade changes across the workspace."
      />

      <div className="flex flex-wrap items-end gap-3">
        <select
          className={selectClassName}
          aria-label="Filter by teacher"
          value={actorId}
          onChange={(event) => {
            setActorId(event.target.value)
            setLimit(PAGE_SIZE)
          }}
        >
          <option value="">All teachers</option>
          {(profiles ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name || p.email}
            </option>
          ))}
        </select>

        <DateInput
          aria-label="Filter from date"
          className="w-auto"
          value={from}
          onChange={(event) => {
            setFrom(event.target.value)
            setLimit(PAGE_SIZE)
          }}
        />

        <DateInput
          aria-label="Filter to date"
          className="w-auto"
          value={to}
          onChange={(event) => {
            setTo(event.target.value)
            setLimit(PAGE_SIZE)
          }}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : (entries ?? []).length === 0 ? (
        <EmptyState
          title={hasActiveFilters ? 'No matching activity' : 'No activity yet'}
          description={
            hasActiveFilters
              ? 'No audit events match the selected teacher or date range.'
              : 'Role changes, classroom edits, and grade updates will show up here.'
          }
        />
      ) : (
        <>
          <TableContainer>
            <Table>
              <THead>
                <TR>
                  <TH>Time</TH>
                  <TH>Actor</TH>
                  <TH>Action</TH>
                  <TH>Target</TH>
                </TR>
              </THead>
              <TBody>
                {(entries ?? []).map((entry) => (
                  <TR key={entry.id}>
                    <TD className="text-(--color-ink-muted)">
                      {formatTimestamp(entry.created_at)}
                    </TD>
                    <TD className="font-medium">{actorLabel(entry)}</TD>
                    <TD>
                      <Badge tone="neutral">{entry.action}</Badge>
                    </TD>
                    <TD className="text-(--color-ink-muted)">
                      {entry.target_table} · {shortId(entry.target_id)}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableContainer>

          {hasMore && (
            <div className="flex justify-center">
              <Button
                variant="secondary"
                onClick={() => setLimit((current) => current + PAGE_SIZE)}
                aria-label="Load more audit log entries"
              >
                Load more
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
