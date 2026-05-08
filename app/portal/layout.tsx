import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import PortalShell from '@/components/portal/shell'

/**
 * Portal layout — agent-gated.
 * Full role enforcement (agent + active status) added in Phase 1 & 5.
 */
export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  if (!session) {
    redirect('/login?next=/portal')
  }

  return <PortalShell>{children}</PortalShell>
}
