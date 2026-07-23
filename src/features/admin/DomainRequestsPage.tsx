import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { PageHeader } from '@/components/layout/PageHeader'
import { Table, TableContainer, TBody, TD, TH, THead, TR } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/toast'
import { useProfile } from '@/lib/queries/profiles'
import {
  useDomainRequests,
  useApproveDomainRequest,
  useDismissDomainRequest,
} from '@/lib/queries/domainRequests'
import type { DomainRequest } from '@/types/domain'

export function DomainRequestsPage() {
  const navigate = useNavigate()
  const { data: profile, isLoading: profileLoading } = useProfile()
  const isAdmin = profile?.role === 'admin'

  useEffect(() => {
    if (!profileLoading && profile && !isAdmin) {
      navigate({ to: '/teacher/dashboard' })
    }
  }, [profileLoading, profile, isAdmin, navigate])

  const { data: requests, isLoading } = useDomainRequests()
  const approve = useApproveDomainRequest()
  const dismiss = useDismissDomainRequest()
  const { toast } = useToast()

  if (profileLoading || !isAdmin) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    )
  }

  async function handleApprove(request: DomainRequest) {
    try {
      await approve.mutateAsync(request)
      toast({ title: `Allowlisted ${request.domain}`, tone: 'success' })
    } catch (error) {
      toast({
        title: 'Could not approve request',
        description: error instanceof Error ? error.message : undefined,
        tone: 'error',
      })
    }
  }

  async function handleDismiss(id: string) {
    try {
      await dismiss.mutateAsync(id)
      toast({ title: 'Request dismissed', tone: 'success' })
    } catch (error) {
      toast({
        title: 'Could not dismiss request',
        description: error instanceof Error ? error.message : undefined,
        tone: 'error',
      })
    }
  }

  const busy = approve.isPending || dismiss.isPending

  return (
    <div className="space-y-6">
      <PageHeader
        title="Domain requests"
        description="Schools asking to be allowlisted for teacher sign-up."
      />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : (requests ?? []).length === 0 ? (
        <EmptyState
          title="No pending requests"
          description="New requests from the landing page appear here for review."
        />
      ) : (
        <TableContainer>
          <Table>
            <THead>
              <TR>
                <TH>Domain</TH>
                <TH>School</TH>
                <TH>Requested by</TH>
                <TH>Message</TH>
                <TH className="w-48 text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {(requests ?? []).map((request) => (
                <TR key={request.id}>
                  <TD>
                    <Badge tone="accent">{request.domain}</Badge>
                  </TD>
                  <TD className="font-medium">{request.school}</TD>
                  <TD className="text-(--color-ink-muted)">{request.name}</TD>
                  <TD className="max-w-xs truncate text-(--color-ink-muted)">
                    {request.message || '—'}
                  </TD>
                  <TD>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(request)}
                        disabled={busy}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDismiss(request.id)}
                        disabled={busy}
                      >
                        Dismiss
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </TableContainer>
      )}
    </div>
  )
}
