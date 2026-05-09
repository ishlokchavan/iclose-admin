'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, FileText, HandCoins,
  ShieldCheck, Settings, Briefcase, UserCircle, ChevronRight, LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Role } from '@/db/schema'
import { signOut } from '@/lib/actions/auth'

const NAV_ITEMS = [
  { label: 'Overview',   href: '/dashboard',            icon: LayoutDashboard, exact: true,  roles: null },
  { label: 'Agents',     href: '/dashboard/agents',     icon: Users,           exact: false, roles: ['super_admin', 'agent_manager'] },
  { label: 'Deals',      href: '/dashboard/deals',      icon: Briefcase,       exact: false, roles: ['super_admin', 'agent_manager'] },
  { label: 'Commission', href: '/dashboard/commission', icon: HandCoins,       exact: false, roles: ['super_admin', 'agent_manager'] },
  { label: 'CMS',        href: '/dashboard/cms',        icon: FileText,        exact: false, roles: ['super_admin', 'content_manager'] },
] as const

const NAV_BOTTOM = [
  { label: 'Users',    href: '/dashboard/users',    icon: UserCircle,  exact: false, roles: ['super_admin'] },
  { label: 'Audit',    href: '/dashboard/audit',    icon: ShieldCheck, exact: false, roles: ['super_admin', 'auditor'] },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings,    exact: false, roles: ['super_admin'] },
] as const

function NavLink({ href, icon: Icon, label, exact = false }: {
  href: string; icon: React.ElementType; label: string; exact?: boolean
}) {
  const pathname = usePathname()
  const isActive = exact ? pathname === href : pathname.startsWith(href)
  return (
    <Link href={href} prefetch={false} className={cn('admin-sidebar-link', isActive && 'admin-sidebar-link-active')}>
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span className="flex-1">{label}</span>
      {isActive && <ChevronRight className="h-3 w-3 text-graphite-light" aria-hidden />}
    </Link>
  )
}

export default function SidebarNav({ role }: { role: Role | null }) {
  const visibleMain = NAV_ITEMS.filter(
    (item) => item.roles === null || (role && item.roles.includes(role as never))
  )
  const visibleBottom = NAV_BOTTOM.filter(
    (item) => role && item.roles.includes(role as never)
  )

  return (
    <>
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Main navigation">
        <p className="admin-section-label mb-2 px-3">Main</p>
        <ul className="flex flex-col gap-0.5">
          {visibleMain.map((item) => (
            <li key={item.href}>
              <NavLink {...item} />
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-hairline px-3 py-4">
        {visibleBottom.length > 0 && (
          <>
            <p className="admin-section-label mb-2 px-3">System</p>
            <ul className="flex flex-col gap-0.5 mb-3">
              {visibleBottom.map((item) => (
                <li key={item.href}>
                  <NavLink {...item} />
                </li>
              ))}
            </ul>
            <div className="hairline mb-3" />
          </>
        )}
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-red-500 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden />
            Sign out
          </button>
        </form>
      </div>
    </>
  )
}
