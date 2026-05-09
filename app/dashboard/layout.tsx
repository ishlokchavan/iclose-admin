import { ADMIN_ROLES } from '@/db/schema'
import { requireRole } from '@/lib/auth'
import DashboardShell from '@/components/dashboard/shell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireRole(ADMIN_ROLES)
  return <DashboardShell>{children}</DashboardShell>
}
