import type { Metadata } from 'next'
import { requireRole } from '@/lib/auth'
import { TrendingUp } from 'lucide-react'

export const metadata: Metadata = { title: 'Request Advance' }

export default async function PortalAdvancePage() {
  await requireRole(['agent'])
  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="eyebrow mb-2">Finance</p>
        <h1 className="admin-page-title">Commission Advance</h1>
        <p className="mt-1 text-[14px] text-graphite">Request an early commission advance on a signed deal.</p>
      </div>
      <div className="card-surface flex flex-col items-center gap-4 py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-mist">
          <TrendingUp className="h-6 w-6 text-graphite-light" />
        </div>
        <p className="font-display text-[17px] font-semibold text-ink">Coming in Phase 5</p>
      </div>
    </div>
  )
}
