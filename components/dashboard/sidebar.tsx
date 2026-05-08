import Link from 'next/link'
import {
  LayoutDashboard,
  Users,
  FileText,
  DollarSign,
  Settings,
  BookOpen,
  Shield,
  UserCog,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  /** Phase in which this route becomes fully active */
  phase?: number
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Agents', href: '/dashboard/agents', icon: Users, phase: 4 },
  { label: 'Deals', href: '/dashboard/deals', icon: FileText, phase: 5 },
  { label: 'Commission', href: '/dashboard/commission', icon: DollarSign, phase: 5 },
  { label: 'CMS', href: '/dashboard/cms', icon: BookOpen, phase: 6 },
  { label: 'Users', href: '/dashboard/users', icon: UserCog, phase: 7 },
  { label: 'Audit Log', href: '/dashboard/audit', icon: Shield, phase: 7 },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings, phase: 7 },
]

interface SidebarProps {
  currentPath?: string
}

export function Sidebar({ currentPath = '' }: SidebarProps) {
  return (
    <aside className="flex h-full w-60 flex-col border-r border-hairline bg-paper">
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-ink">
          <span className="font-display text-[13px] font-semibold tracking-tightest text-paper">
            iC
          </span>
        </div>
        <span className="font-display text-[15px] font-semibold tracking-tight text-ink">
          iClose Admin
        </span>
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive =
              item.href === '/dashboard'
                ? currentPath === '/dashboard'
                : currentPath.startsWith(item.href)

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn('sidebar-item', isActive && 'sidebar-item-active')}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                  {item.phase && item.phase > 3 && (
                    <span className="ml-auto rounded-full bg-mist px-1.5 py-0.5 font-mono text-[10px] text-graphite-light">
                      P{item.phase}
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <Separator />

      {/* User / Sign out — wired in Phase 1 */}
      <div className="p-4">
        <div className="flex items-center gap-3 rounded-xl bg-mist px-3 py-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-paper">
            A
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-ink">Admin User</p>
            <p className="truncate text-[11px] text-graphite-light">super_admin</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
