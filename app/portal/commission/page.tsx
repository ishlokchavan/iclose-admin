import type { Metadata } from 'next'
import { requireRole } from '@/lib/auth'
import { getMyCommission } from '@/lib/actions/portal'
import { formatDate } from '@/lib/utils'

export const metadata: Metadata = { title: 'My Commission' }

export default async function PortalCommissionPage() {
  await requireRole(['agent'])
  const data = await getMyCommission()

  function formatAed(val: string) {
    return `AED ${parseFloat(val).toLocaleString('en-AE', { minimumFractionDigits: 0 })}`
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="eyebrow mb-2">Finance</p>
        <h1 className="admin-page-title">Commission</h1>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Earned', value: formatAed(data.earned), color: 'text-ink' },
          { label: 'Total Paid', value: formatAed(data.paid), color: 'text-emerald-600' },
          { label: 'Pending', value: formatAed(data.pending), color: 'text-accent' },
        ].map((s) => (
          <div key={s.label} className="card-mist flex flex-col gap-2 p-5">
            <p className="admin-section-label">{s.label}</p>
            <p className={`font-display text-[24px] font-semibold tracking-tight ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {data.advances.length > 0 && (
        <div className="card-surface overflow-hidden">
          <div className="border-b border-hairline px-6 py-4">
            <h2 className="font-display text-[15px] font-semibold text-ink">Advance Requests</h2>
          </div>
          <div className="divide-y divide-hairline">
            {data.advances.map((adv) => (
              <div key={adv.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-[14px] font-medium text-ink">{formatAed(adv.amountRequested)}</p>
                  <p className="text-[12px] text-graphite">{adv.deal?.propertyRef} · {formatDate(adv.requestedAt)}</p>
                </div>
                <span className={`badge ${
                  adv.status === 'disbursed' ? 'badge-active' :
                  adv.status === 'approved'  ? 'badge-approved' :
                  adv.status === 'rejected'  ? 'badge-rejected' : 'badge-applied'
                }`}>{adv.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
