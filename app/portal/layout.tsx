import { requireRole } from '@/lib/auth'
import PortalShell from '@/components/portal/shell'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  await requireRole(['agent'])
  return <PortalShell>{children}</PortalShell>
}
