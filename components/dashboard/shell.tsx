import { getProfile } from '@/lib/auth'
import SidebarNav from './sidebar-nav'
import UserMenu from './user-menu'
import type { Role } from '@/db/schema'

export default async function DashboardShell({ children }: { children: React.ReactNode }) {
  const profile = await getProfile()
  const role = profile?.role as Role | null

  return (
    <div className="flex min-h-screen bg-fog">
      <aside className="fixed inset-y-0 left-0 z-40 flex w-[220px] flex-col border-r border-hairline bg-paper">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-hairline px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-ink">
            <svg width="16" height="16" viewBox="0 0 28 28" fill="none" aria-hidden>
              <path d="M14 2C7.373 2 2 7.373 2 14s5.373 12 12 12 12-5.373 12-12S20.627 2 14 2zm0 3a9 9 0 110 18A9 9 0 0114 5zm-1 4v6.5l4.5 2.7-.9 1.5L11 16.5V9h2z" fill="white" fillOpacity="0.9"/>
            </svg>
          </div>
          <span className="font-display text-[15px] font-semibold tracking-tight text-ink">iClose</span>
          <span className="ml-auto rounded-md bg-mist px-1.5 py-0.5 font-mono text-[10px] font-medium text-graphite">Admin</span>
        </div>

        <SidebarNav role={role} />
      </aside>

      <div className="ml-[220px] flex flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-end border-b border-hairline bg-paper/80 px-6 backdrop-blur-sm gap-3">
          <UserMenu profile={profile} />
        </header>
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  )
}
