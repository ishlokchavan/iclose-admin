'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import Link from 'next/link'
import { LogOut, Settings, ChevronDown } from 'lucide-react'
import { signOut } from '@/lib/actions/auth'
import type { Profile } from '@/db/schema'
import { cn } from '@/lib/utils'

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  content_manager: 'Content',
  agent_manager: 'Agent Mgr',
  auditor: 'Auditor',
}

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-700',
  content_manager: 'bg-blue-100 text-blue-700',
  agent_manager: 'bg-emerald-100 text-emerald-700',
  auditor: 'bg-gray-100 text-gray-600',
}

export default function UserMenu({ profile }: { profile: Profile | null }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  if (!profile) return null

  const initials = profile.fullName
    .split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div ref={ref} className="relative flex items-center gap-3">
      {/* Role badge */}
      <span className={cn(
        'hidden rounded-full px-2.5 py-0.5 font-sans text-[11px] font-semibold uppercase tracking-wide sm:inline-flex',
        ROLE_COLORS[profile.role] ?? 'bg-gray-100 text-gray-600'
      )}>
        {ROLE_LABELS[profile.role] ?? profile.role}
      </span>

      {/* Avatar button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 rounded-xl px-2 py-1 hover:bg-mist transition-colors"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-[12px] font-semibold text-white">
          {initials}
        </div>
        <span className="hidden font-sans text-[13px] font-medium text-ink lg:block">
          {profile.fullName.split(' ')[0]}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-graphite-light" />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-hairline bg-paper shadow-elevated">
          {/* Profile info */}
          <div className="border-b border-hairline px-4 py-3">
            <p className="text-[13px] font-semibold text-ink">{profile.fullName}</p>
            <p className="text-[12px] text-graphite capitalize">{profile.role.replace('_', ' ')}</p>
          </div>

          {/* Links */}
          <div className="py-1">
            <Link
              href="/dashboard/settings"
              prefetch={false}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-ink hover:bg-mist transition-colors"
            >
              <Settings className="h-4 w-4 text-graphite" />
              Settings & Profile
            </Link>
          </div>

          <div className="border-t border-hairline py-1">
            <form action={signOut}>
              <button
                type="submit"
                disabled={isPending}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-[13px] text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
