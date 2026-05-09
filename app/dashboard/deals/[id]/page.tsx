/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth'
import { getDeal } from '@/lib/actions/deals'
import { formatDate, formatDateTime } from '@/lib/utils'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = { title: 'Deal Detail' }

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireRole(['super_admin', 'agent_manager', 'auditor'])
  const { id } = await params
  const deal = await getDeal(id)
  if (!deal) notFound()

  function formatAed(val: string) {
    return `AED ${parseFloat(val).toLocaleString('en-AE', { minimumFractionDigits: 2 })}`
  }

  const STATUS_COLORS: Record<string, string> = {
    pending:   'badge-contacted',
    signed:    'badge-approved',
    paid:      'badge-active',
    cancelled: 'badge-rejected',
  }

  return (
    <div className="flex flex-col gap-6">
      <Link href="/dashboard/deals"
        className="flex items-center gap-1.5 text-[13px] text-graphite hover:text-ink w-fit">
        <ArrowLeft className="h-3.5 w-3.5" /> All deals
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow mb-1">Deal</p>
          <h1 className="admin-page-title">{deal.property_ref}</h1>
          <Link href={`/dashboard/agents/${(deal.agents as any)?.id}`}
            className="mt-1 text-[13px] text-accent hover:underline">
            {(deal.agents as any)?.full_name}
          </Link>
        </div>
        <span className={STATUS_COLORS[deal.status] ?? 'badge-applied'}>
          {deal.status.charAt(0).toUpperCase() + deal.status.slice(1)}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Financials */}
        <div className="card-surface overflow-hidden">
          <div className="border-b border-hairline px-6 py-4">
            <h2 className="font-display text-[15px] font-semibold text-ink">Financials</h2>
          </div>
          <div className="divide-y divide-hairline">
            {[
              { label: 'Transaction Type', value: deal.transaction_type === 'off_plan' ? 'Off Plan' : 'Secondary Market' },
              { label: 'Deal Amount', value: formatAed(deal.amount) },
              { label: 'Commission Rate', value: `${(parseFloat(deal.commission_rate) * 100).toFixed(2)}%` },
              { label: 'Gross Commission', value: formatAed(deal.commission_amount) },
              { label: 'VAT (5%)', value: `${formatAed(deal.vat_amount ?? '0')} (${deal.vat_included ? 'included' : 'excluded'})` },
              { label: 'Total Payable', value: formatAed(String(parseFloat(deal.commission_amount) + (deal.vat_included ? 0 : parseFloat(deal.vat_amount ?? '0')))) },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between px-6 py-4">
                <p className="text-[13px] text-graphite">{label}</p>
                <p className="text-[14px] font-semibold text-ink">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className="card-surface overflow-hidden">
          <div className="border-b border-hairline px-6 py-4">
            <h2 className="font-display text-[15px] font-semibold text-ink">Timeline</h2>
          </div>
          <div className="divide-y divide-hairline">
            {[
              { label: 'Created', value: formatDateTime(deal.created_at) },
              { label: 'Signed', value: deal.signed_at ? formatDateTime(deal.signed_at) : '—' },
              { label: 'Paid', value: deal.paid_at ? formatDateTime(deal.paid_at) : '—' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between px-6 py-4">
                <p className="text-[13px] text-graphite">{label}</p>
                <p className="text-[13px] text-ink">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Advances */}
      {deal.commission_advances && deal.commission_advances.length > 0 && (
        <div className="card-surface overflow-hidden">
          <div className="border-b border-hairline px-6 py-4">
            <h2 className="font-display text-[15px] font-semibold text-ink">Commission Advances</h2>
          </div>
          <div className="divide-y divide-hairline">
            {deal.commission_advances.map((adv) => (
              <div key={adv.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-[14px] font-medium text-ink">{formatAed(adv.amount_requested)}</p>
                  <p className="text-[12px] text-graphite">{formatDate(adv.requested_at)}</p>
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
