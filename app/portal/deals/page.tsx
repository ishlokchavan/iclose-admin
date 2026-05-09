import type { Metadata } from 'next'
import { requireRole } from '@/lib/auth'
import { getMyDeals } from '@/lib/actions/portal'
import { formatDate } from '@/lib/utils'
import { Briefcase } from 'lucide-react'

export const metadata: Metadata = { title: 'My Deals' }

export default async function PortalDealsPage() {
  await requireRole(['agent'])
  const deals = await getMyDeals()

  function formatAed(val: string) {
    return `AED ${parseFloat(val).toLocaleString('en-AE', { minimumFractionDigits: 0 })}`
  }

  const STATUS_COLORS: Record<string, string> = {
    pending:   'badge-contacted',
    signed:    'badge-approved',
    paid:      'badge-active',
    cancelled: 'badge-rejected',
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="eyebrow mb-2">My Activity</p>
        <h1 className="admin-page-title">My Deals</h1>
        <p className="mt-1 text-[14px] text-graphite">{deals.length} deals total</p>
      </div>

      <div className="card-surface overflow-hidden">
        {deals.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Briefcase className="h-8 w-8 text-graphite-light" />
            <p className="text-[14px] text-graphite">No deals yet.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 border-b border-hairline px-6 py-3">
              {['Property', 'Amount', 'Commission', 'Status'].map((h) => (
                <p key={h} className="admin-section-label">{h}</p>
              ))}
            </div>
            <div className="divide-y divide-hairline">
              {deals.map((deal) => (
                <div key={deal.id} className="grid grid-cols-[2fr_1fr_1fr_1fr] items-center gap-4 px-6 py-4">
                  <div>
                    <p className="text-[14px] font-medium text-ink">{deal.propertyRef}</p>
                    <p className="text-[12px] text-graphite">{formatDate(deal.createdAt)}</p>
                  </div>
                  <p className="text-[13px] text-ink">{formatAed(deal.amount)}</p>
                  <p className="text-[13px] font-medium text-ink">{formatAed(deal.commissionAmount)}</p>
                  <span className={STATUS_COLORS[deal.status] ?? 'badge-applied'}>
                    {deal.status.charAt(0).toUpperCase() + deal.status.slice(1)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
