import { useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Table, TableContainer, TBody, TD, TH, THead, TR } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { useToast } from '@/components/ui/toast'
import { useProfile, useProfiles, useUpdateProfileRole } from '@/lib/queries/profiles'
import type { AppRole } from '@/types/domain'

export function UsersPage() {
  const navigate = useNavigate()
  const { data: profile, isLoading: profileLoading } = useProfile()
  const isAdmin = profile?.role === 'admin'

  useEffect(() => {
    if (!profileLoading && profile && !isAdmin) {
      navigate({ to: '/teacher/dashboard' })
    }
  }, [profileLoading, profile, isAdmin, navigate])

  const { data: profiles, isLoading } = useProfiles()
  const updateRole = useUpdateProfileRole()
  const { toast } = useToast()

  if (profileLoading || !isAdmin) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    )
  }

  async function handleRoleChange(id: string, role: AppRole) {
    try {
      await updateRole.mutateAsync({ id, role })
      toast({ title: 'Role updated', tone: 'success' })
    } catch (error) {
      toast({
        title: 'Could not update role',
        description: error instanceof Error ? error.message : undefined,
        tone: 'error',
      })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Users" description="Manage teacher and administrator access." />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <TableContainer>
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Email</TH>
                <TH>Role</TH>
                <TH className="w-40 text-right">Change role</TH>
              </TR>
            </THead>
            <TBody>
              {(profiles ?? []).map((user) => (
                <TR key={user.id}>
                  <TD className="font-medium">{user.full_name || '—'}</TD>
                  <TD className="text-(--color-ink-muted)">{user.email}</TD>
                  <TD>
                    <Badge tone={user.role === 'admin' ? 'accent' : 'neutral'}>
                      {user.role}
                    </Badge>
                  </TD>
                  <TD className="text-right">
                    <Select
                      value={user.role}
                      onValueChange={(value) =>
                        handleRoleChange(user.id, value as AppRole)
                      }
                      disabled={user.id === profile?.id || updateRole.isPending}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="teacher">teacher</SelectItem>
                        <SelectItem value="admin">admin</SelectItem>
                      </SelectContent>
                    </Select>
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
