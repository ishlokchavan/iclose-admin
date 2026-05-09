import type { Metadata } from 'next'
import { requireRole } from '@/lib/auth'
import { getAdminUsers } from '@/lib/actions/users'
import InviteUserDialog from './invite-user-dialog'
import UserRow from './user-row'

export const metadata: Metadata = { title: 'Users' }

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  content_manager: 'Content Manager',
  agent_manager: 'Agent Manager',
  auditor: 'Auditor',
}

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'badge-active',
  content_manager: 'badge-approved',
  agent_manager: 'badge-contacted',
  auditor: 'badge-applied',
}

export default async function UsersPage() {
  const actor = await requireRole(['super_admin'])
  const users = await getAdminUsers()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">System</p>
          <h1 className="admin-page-title">Users</h1>
          <p className="mt-1 text-[14px] text-graphite">{users.length} admin user{users.length !== 1 ? 's' : ''}</p>
        </div>
        <InviteUserDialog />
      </div>

      <div className="card-surface overflow-hidden">
        <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_auto] gap-4 border-b border-hairline px-6 py-3">
          {['User', 'Email', 'Role', 'Status', ''].map((h) => (
            <p key={h} className="admin-section-label">{h}</p>
          ))}
        </div>

        {users.length === 0 ? (
          <div className="py-16 text-center text-[14px] text-graphite">No admin users yet.</div>
        ) : (
          <div className="divide-y divide-hairline">
            {users.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                actorId={actor.id}
                roleLabels={ROLE_LABELS}
                roleColors={ROLE_COLORS}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
