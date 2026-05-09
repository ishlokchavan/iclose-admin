import type { Metadata } from 'next'
import { requireRole, getUser } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'
import ChangePasswordForm from './change-password-form'
import ProfileForm from './profile-form'

export const metadata: Metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const profile = await requireRole(['super_admin', 'content_manager', 'agent_manager', 'auditor'])
  const user = await getUser()

  const sb = createServiceClient()
  const { data: authData } = await sb.auth.admin.listUsers({ perPage: 1000 })
  const users = (authData?.users ?? []) as {id: string; email?: string}[]
  const authUser = users.find(u => u.id === profile.id)
  const email = authUser?.email ?? ''

  const ROLE_LABELS: Record<string, string> = {
    super_admin: 'Super Admin',
    content_manager: 'Content Manager',
    agent_manager: 'Agent Manager',
    auditor: 'Auditor',
  }

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <div>
        <p className="eyebrow mb-2">System</p>
        <h1 className="admin-page-title">Settings</h1>
      </div>

      {/* Account info */}
      <div className="card-surface overflow-hidden">
        <div className="border-b border-hairline px-6 py-4">
          <h2 className="font-display text-[15px] font-semibold text-ink">Account</h2>
        </div>
        <div className="divide-y divide-hairline">
          {[
            { label: 'Name', value: profile.fullName },
            { label: 'Email', value: email },
            { label: 'Role', value: ROLE_LABELS[profile.role] ?? profile.role },
            { label: 'User ID', value: <span className="font-mono text-[12px]">{profile.id.slice(0, 8)}…</span> },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between px-6 py-3">
              <p className="text-[13px] text-graphite">{label}</p>
              <p className="text-[13px] font-medium text-ink">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Update profile */}
      <div className="card-surface overflow-hidden">
        <div className="border-b border-hairline px-6 py-4">
          <h2 className="font-display text-[15px] font-semibold text-ink">Update Profile</h2>
        </div>
        <div className="px-6 py-5">
          <ProfileForm currentName={profile.fullName} userId={profile.id} />
        </div>
      </div>

      {/* Change password */}
      <div className="card-surface overflow-hidden">
        <div className="border-b border-hairline px-6 py-4">
          <h2 className="font-display text-[15px] font-semibold text-ink">Change Password</h2>
        </div>
        <div className="px-6 py-5">
          <ChangePasswordForm />
        </div>
      </div>

      {/* Danger zone */}
      <div className="rounded-xl border border-red-200 overflow-hidden">
        <div className="border-b border-red-200 bg-red-50 px-6 py-4">
          <h2 className="font-display text-[15px] font-semibold text-red-700">Danger Zone</h2>
        </div>
        <div className="px-6 py-5">
          <p className="text-[13px] text-graphite mb-4">Once you sign out all sessions, you'll need to log in again everywhere.</p>
          <form action="/api/auth/signout-all" method="POST">
            <button type="submit" className="rounded-xl border border-red-300 px-4 py-2 text-[13px] font-medium text-red-600 hover:bg-red-50 transition-colors">
              Sign out all sessions
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
