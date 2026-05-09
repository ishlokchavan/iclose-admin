'use client'

import { useTransition, useState } from 'react'
import { updateUserRole, updateUserStatus, deleteAdminUser, resendInvite } from '@/lib/actions/users'
import { MoreHorizontal, RefreshCw, Shield, Ban, Trash2, CheckCircle } from 'lucide-react'
import { formatDate } from '@/lib/utils'

type User = {
  id: string
  full_name: string
  email: string
  role: string
  status: string
  created_at: string
  lastSignIn: string | null
}

const ROLES = ['super_admin', 'content_manager', 'agent_manager', 'auditor']
const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin', content_manager: 'Content Manager',
  agent_manager: 'Agent Manager', auditor: 'Auditor',
}

export default function UserRow({
  user, actorId, roleLabels, roleColors,
}: {
  user: User
  actorId: string
  roleLabels: Record<string, string>
  roleColors: Record<string, string>
}) {
  const [isPending, startTransition] = useTransition()
  const [menuOpen, setMenuOpen] = useState(false)
  const isSelf = user.id === actorId
  const isSuspended = user.status === 'suspended'

  function act(fn: () => Promise<unknown>) {
    setMenuOpen(false)
    startTransition(async () => { await fn() })
  }

  return (
    <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_auto] items-center gap-4 px-6 py-4">
      {/* User */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink/90 text-[12px] font-semibold text-white">
          {user.full_name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[14px] font-medium text-ink">
            {user.full_name} {isSelf && <span className="text-[11px] text-graphite-light">(you)</span>}
          </p>
          <p className="text-[12px] text-graphite">{user.lastSignIn ? `Last seen ${formatDate(user.lastSignIn)}` : 'Never signed in'}</p>
        </div>
      </div>

      {/* Email */}
      <p className="truncate text-[13px] text-graphite">{user.email}</p>

      {/* Role */}
      {isSelf ? (
        <span className={`${roleColors[user.role] ?? 'badge-applied'} w-fit`}>{roleLabels[user.role] ?? user.role}</span>
      ) : (
        <select
          value={user.role}
          disabled={isPending || isSelf}
          onChange={(e) => act(() => updateUserRole(user.id, e.target.value))}
          className="h-8 rounded-lg border border-hairline bg-paper px-2 text-[12px] text-ink disabled:opacity-50"
        >
          {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
      )}

      {/* Status */}
      <span className={`badge w-fit ${isSuspended ? 'badge-rejected' : 'badge-active'}`}>
        {isSuspended ? 'Suspended' : 'Active'}
      </span>

      {/* Actions */}
      {!isSelf && (
        <div className="relative">
          <button
            onClick={() => setMenuOpen(v => !v)}
            disabled={isPending}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-graphite hover:bg-mist disabled:opacity-40"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full z-20 mt-1 w-48 overflow-hidden rounded-xl border border-hairline bg-paper shadow-elevated">
                <button
                  onClick={() => act(() => resendInvite(user.email))}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-[13px] text-ink hover:bg-mist"
                >
                  <RefreshCw className="h-4 w-4 text-graphite" /> Resend invite
                </button>
                <button
                  onClick={() => act(() => updateUserStatus(user.id, isSuspended ? 'active' : 'suspended'))}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-[13px] text-ink hover:bg-mist"
                >
                  {isSuspended
                    ? <><CheckCircle className="h-4 w-4 text-green-500" /> Reactivate</>
                    : <><Ban className="h-4 w-4 text-amber-500" /> Suspend</>
                  }
                </button>
                <div className="border-t border-hairline" />
                <button
                  onClick={() => { if (confirm(`Delete ${user.full_name}? This cannot be undone.`)) act(() => deleteAdminUser(user.id)) }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-[13px] text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" /> Delete user
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
