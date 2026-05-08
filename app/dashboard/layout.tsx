import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import DashboardShell from '@/components/dashboard/shell'

/**
 * Dashboard layout — role-gated.
 * Full role enforcement added in Phase 1 once profiles table exists.
 * Currently enforces authentication only.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  if (!session) {
    redirect('/login?next=/dashboard')
  }

  return <DashboardShell>{children}</DashboardShell>
}
