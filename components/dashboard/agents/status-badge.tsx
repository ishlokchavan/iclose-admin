import { cn } from '@/lib/utils'
import type { ApplicationStatus } from '@/db/schema'

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; className: string }> = {
  applied:   { label: 'Applied',   className: 'badge-applied' },
  contacted: { label: 'Contacted', className: 'badge-contacted' },
  qualified: { label: 'Qualified', className: 'badge-qualified' },
  approved:  { label: 'Approved',  className: 'badge-approved' },
  active:    { label: 'Active',    className: 'badge-active' },
  rejected:  { label: 'Rejected',  className: 'badge-rejected' },
  inactive:  { label: 'Inactive',  className: 'badge-inactive' },
}

export function StatusBadge({
  status,
  className,
}: {
  status: ApplicationStatus
  className?: string
}) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.applied
  return <span className={cn(config.className, className)}>{config.label}</span>
}
