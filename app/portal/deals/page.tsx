/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Metadata } from 'next'
import { requireRole, getProfile } from '@/lib/auth'
import { getMyDeals } from '@/lib/actions/portal'
import { createServiceClient } from '@/lib/supabase/service'
import { PLAN_CONFIG } from '@/db/schema'
import { getPlan } from '@/lib/plans'
import { formatDate } from '@/lib/utils'
import { Briefcase } from 'lucide-react'

export const metadata: Metadata = { title: 'My Deals' }

export default async function PortalDealsPage() {
  await requireRole(['agent'])
  const profile = await getProfile()

  const agent = profile ? await (async () => {
    const sb = createServiceClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (sb as any).from('agents').select('plan').eq('profile_id', profile.id).single()
    return data
  })() : null

  const plan = agent?.plan ?? 'plus'
  const planRow = await getPlan(plan)
  const planConfig = PLAN_CONFIG[plan as keyof typeof PLAN_CONFIG]
  const agentSplit = (planRow.agentSplitPct ?? planConfig.agentSplit * 100) / 100
  const planLabel: string = planRow.label ?? planConfig.label

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

  const totalEarned = deals
    .filter(d => d.status === 'signed' || d.status === 'paid')
    .reduce((sum, d) => sum + parseFloat(d.commissionAmount) * agentSplit, 0)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">My Activity</p>
          <h1 className="admin-page-title">My Deals</h1>
          <p className="mt-1 text-[14px] text-graphite">{deals.length} deals total</p>
        </div>
        {/* Plan badge */}
        <div className="flex flex-col items-end gap-1">
          <span className="rounded-full bg-ink px-3 py-1 text-[12px] font-semibold text-white">
            {planLabel}
          </span>
          <span className="text-[12px] text-graphite">{(agentSplit * 100).toFixed(0)}% commission split</span>
        </div>
      </div>

      {/* Your earnings strip */}
      {deals.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Your Split', value: `${(agentSplit * 100).toFixed(0)}%`, sub: planLabel + ' plan' },
            { label: 'Your Earnings (signed)', value: `AED ${totalEarned.toLocaleString('en-AE', { minimumFractionDigits: 0 })}`, sub: 'Based on signed deals' },
            { label: 'iClose Share', value: `${((1 - agentSplit) * 100).toFixed(0)}%`, sub: 'Platform fee' },
          ].map((s) => (
            <div key={s.label} className="card-mist flex flex-col gap-1 p-4">
              <p className="admin-section-label">{s.label}</p>
              <p className="font-display text-[20px] font-semibold tracking-tight text-ink">{s.value}</p>
              <p className="text-[11px] text-graphite">{s.sub}</p>
            </div>
          ))}
        </div>
      )}

      <div className="card-surface overflow-hidden">
        {deals.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Briefcase className="h-8 w-8 text-graphite-light" />
            <p className="text-[14px] text-graphite">No deals yet.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 border-b border-hairline px-6 py-3">
              {['Property', 'Deal Value', 'Gross Commission', 'Your Payout', 'Status'].map((h) => (
                <p key={h} className="admin-section-label">{h}</p>
              ))}
            </div>
            <div className="divide-y divide-hairline">
              {deals.map((deal) => {
                const gross = parseFloat(deal.commissionAmount)
                const yourPayout = gross * agentSplit
                return (
                  <div key={deal.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] items-center gap-4 px-6 py-4">
                    <div>
                      <p className="text-[14px] font-medium text-ink">{deal.propertyRef}</p>
                      <p className="text-[12px] text-graphite">{formatDate(deal.createdAt)}</p>
                    </div>
                    <p className="text-[13px] text-ink">{formatAed(deal.amount)}</p>
                    <p className="text-[13px] text-graphite">{formatAed(deal.commissionAmount)}</p>
                    <p className="text-[13px] font-semibold text-ink">
                      AED {yourPayout.toLocaleString('en-AE', { minimumFractionDigits: 0 })}
                    </p>
                    <span className={STATUS_COLORS[deal.status] ?? 'badge-applied'}>
                      {deal.status.charAt(0).toUpperCase() + deal.status.slice(1)}
                    </span>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Upgrade nudge for non-Ultra */}
      {plan !== 'ultra' && deals.length > 0 && (
        <div className="rounded-xl border border-accent/20 bg-accent/5 px-5 py-4">
          <p className="text-[13px] font-medium text-ink">
            Upgrade to a higher plan to keep more of your commission.
            {plan === 'plus' && ' On Pro you keep 80% instead of 60%.'}
            {plan === 'pro' && ' On Pro Max you keep 90% instead of 80%.'}
            {plan === 'pro_max' && ' On Ultra you keep 100% of every deal.'}
          </p>
        </div>
      )}
    </div>
  )
}
