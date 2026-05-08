'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  FileText,
  HandCoins,
  ShieldCheck,
  Settings,
  Briefcase,
  UserCircle,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Navigation config ────────────────────────────────────────────────────────

const NAV_ITEMS = [
  {
    label: 'Overview',
    href: '/dashboard',
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: 'Agents',
    href: '/dashboard/agents',
    icon: Users,
  },
  {
    label: 'Deals',
    href: '/dashboard/deals',
    icon: Briefcase,
  },
  {
    label: 'Commission',
    href: '/dashboard/commission',
    icon: HandCoins,
  },
  {
    label: 'CMS',
    href: '/dashboard/cms',
    icon: FileText,
  },
] as const

const NAV_BOTTOM = [
  {
    label: 'Users',
    href: '/dashboard/users',
    icon: UserCircle,
  },
  {
    label: 'Audit',
    href: '/dashboard/audit',
    icon: ShieldCheck,
  },
  {
    label: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
  },
] as const

// ─── Components ───────────────────────────────────────────────────────────────

function NavLink({
  href,
  icon: Icon,
  label,
  exact = false,
}: {
  href: string
  icon: React.ElementType
  label: string
  exact?: boolean
}) {
  const pathname = usePathname()
  const isActive = exact ? pathname === href : pathname.startsWith(href)

  return (
    <Link
      href={href}
      className={cn('admin-sidebar-link', isActive && 'admin-sidebar-link-active')}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span className="flex-1">{label}</span>
      {isActive && <ChevronRight className="h-3 w-3 text-graphite-light" aria-hidden />}
    </Link>
  )
}

// ─── Shell ────────────────────────────────────────────────────────────────────

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-fog">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 flex w-[220px] flex-col border-r border-hairline bg-paper">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-hairline px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-ink">
            <svg width="16" height="16" viewBox="0 0 28 28" fill="none" aria-hidden>
              <path
                d="M14 2C7.373 2 2 7.373 2 14s5.373 12 12 12 12-5.373 12-12S20.627 2 14 2zm0 3a9 9 0 110 18A9 9 0 0114 5zm-1 4v6.5l4.5 2.7-.9 1.5L11 16.5V9h2z"
                fill="white"
                fillOpacity="0.9"
              />
            </svg>
          </div>
          <span className="font-display text-[15px] font-semibold tracking-tight text-ink">
            iClose
          </span>
          <span className="ml-auto rounded-md bg-mist px-1.5 py-0.5 font-mono text-[10px] font-medium text-graphite">
            Admin
          </span>
        </div>

        {/* Primary nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Main navigation">
          <p className="admin-section-label mb-2 px-3">Main</p>
          <ul className="flex flex-col gap-0.5">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <NavLink {...item} />
              </li>
            ))}
          </ul>
        </nav>

        {/* Bottom nav */}
        <div className="border-t border-hairline px-3 py-4">
          <p className="admin-section-label mb-2 px-3">System</p>
          <ul className="flex flex-col gap-0.5">
            {NAV_BOTTOM.map((item) => (
              <li key={item.href}>
                <NavLink {...item} />
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Main content */}
      <div className="ml-[220px] flex flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center border-b border-hairline bg-paper/80 px-8 backdrop-blur-sm">
          <div className="flex flex-1 items-center gap-4">
            {/* Phase 3: breadcrumb, search */}
            <span className="text-[13px] text-graphite">iClose Admin</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Phase 1: user menu, notifications */}
            <div className="h-8 w-8 rounded-full bg-mist" aria-label="User menu (Phase 1)" />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-8 py-8">
          {children}
        </main>
      </div>
    </div>
  )
}
