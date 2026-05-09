import type { Metadata } from 'next'
import { requireRole } from '@/lib/auth'
import { Briefcase } from 'lucide-react'

export const metadata: Metadata = { title: 'My Deals' }

export default async function PortalDealsPage() {
  await requireRole(['agent'])
  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="eyebrow mb-2">My Activity</p>
        <h1 className="admin-page-title">My Deals</h1>
        <p className="mt-1 text-[14px] text-graphite">Your property deals and commission history.</p>
      </div>
      <div className="card-surface flex flex-col items-center gap-4 py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-mist">
          <Briefcase className="h-6 w-6 text-graphite-light" />
        </div>
        <p className="font-display text-[17px] font-semibold text-ink">Coming in Phase 5</p>
      </div>
    </div>
  )
}
