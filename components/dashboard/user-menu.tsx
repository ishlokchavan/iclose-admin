'use client'

import { useTransition } from 'react'
import { LogOut, Shield, User, Settings } from 'lucide-react'
import { signOut } from '@/lib/actions/auth'
import type { Profile } from '@/db/schema'
import { cn } from '@/lib/utils'

interface UserMenuProps {
  profile: Profile
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  content_manager: 'Content',
  agent_manager: 'Agent Mgr',
  agent: 'Agent',
  auditor: 'Auditor',
}

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-700',
  content_manager: 'bg-blue-100 text-blue-700',
  agent_manager: 'bg-emerald-100 text-emerald-700',
  agent: 'bg-accent/10 text-accent',
  auditor: 'bg-gray-100 text-gray-600',
}

export default function UserMenu({ profile }: UserMenuProps) {
  const [isPending, startTransition] = useTransition()

  function handleSignOut() {
    startTransition(async () => {
      await signOut()
    })
  }

  const initials = profile.fullName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="flex items-center gap-3">
      {/* Role badge */}
      <span className={cn(
        'hidden rounded-full px-2.5 py-0.5 font-sans text-[11px] font-semibold uppercase tracking-wide sm:inline-flex',
        ROLE_COLORS[profile.role] ?? 'bg-gray-100 text-gray-600'
      )}>
        {ROLE_LABELS[profile.role] ?? profile.role}
      </span>

      {/* Avatar + name */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-[12px] font-semibold text-white">
          {initials}
        </div>
        <span className="hidden font-sans text-[13px] font-medium text-ink lg:block">
          {profile.fullName}
        </span>
      </div>
    </div>
  )
}
