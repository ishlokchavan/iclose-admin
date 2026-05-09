import type { Metadata } from 'next'
import { requireRole, getProfile } from '@/lib/auth'
import { getMyCommission } from '@/lib/actions/portal'
import { db } from '@/db/client'
import { agents } from '@/db/schema'
import { PLAN_CONFIG } from '@/db/schema'
import { getPlan } from '@/lib/plans'
import { eq } from 'drizzle-orm'
import { formatDate } from '@/lib/utils'

export const metadata: Metadata = { title: 'My Commission' }

export default async function PortalCommissionPage() {
  await requireRole(['agent'])
  const profile = await getProfile()

  const agent = profile ? await db.query.agents.findFirst({
    where: eq(agents.profileId, profile.id),
    columns: { plan: true, totalCommissionEarned: true, totalCommissionPaid: true },
  }) : null

  const plan = agent?.plan ?? 'plus'
  const planRow = await getPlan(plan)
  const planConfig = PLAN_CONFIG[plan]
  const agentSplit = (planRow.agentSplitPct ?? planConfig.agentSplit * 100) / 100
  const planLabel: string = planRow.label ?? planConfig.label

  const data = await getMyCommission()

  const grossEarned = parseFloat(data.earned)
  const grossPaid = parseFloat(data.paid)
  const yourEarned = grossEarned * agentSplit
  const yourPaid = grossPaid * agentSplit
  const yourPending = yourEarned - yourPaid
  const icloseShare = grossEarned * (1 - agentSplit)

  function formatAed(val: number) {
    return `AED ${val.toLocaleString('en-AE', { minimumFractionDigits: 0 })}`
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Finance</p>
          <h1 className="admin-page-title">Commission</h1>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="rounded-full bg-ink px-3 py-1 text-[12px] font-semibold text-white">
            {planLabel}
          </span>
          <span className="text-[12px] text-graphite">{(agentSplit * 100).toFixed(0)}% split</span>
        </div>
      </div>

      {/* Your payout breakdown */}
      <div className="card-surface overflow-hidden">
        <div className="border-b border-hairline px-6 py-4">
          <h2 className="font-display text-[15px] font-semibold text-ink">Your Earnings</h2>
          <p className="mt-0.5 text-[12px] text-graphite">Based on your {planLabel} plan ({(agentSplit * 100).toFixed(0)}% split)</p>
        </div>
        <div className="grid grid-cols-3 divide-x divide-hairline">
          {[
            { label: 'Your Earned', value: formatAed(yourEarned), color: 'text-ink' },
            { label: 'Your Paid', value: formatAed(yourPaid), color: 'text-emerald-600' },
            { label: 'Your Pending', value: formatAed(yourPending), color: 'text-accent' },
          ].map((s) => (
            <div key={s.label} className="flex flex-col gap-1 p-5">
              <p className="admin-section-label">{s.label}</p>
              <p className={`font-display text-[22px] font-semibold tracking-tight ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
        {/* Gross breakdown */}
        <div className="border-t border-hairline px-6 py-4">
          <p className="admin-section-label mb-3">Full Breakdown</p>
          <div className="flex flex-col gap-2">
            {[
              { label: 'Gross Commission (total deal)', value: formatAed(grossEarned) },
              { label: `Your share (${(agentSplit * 100).toFixed(0)}%)`, value: formatAed(yourEarned), highlight: true },
              { label: `iClose share (${((1 - agentSplit) * 100).toFixed(0)}%)`, value: formatAed(icloseShare) },
            ].map(({ label, value, highlight }) => (
              <div key={label} className={`flex justify-between text-[13px] ${highlight ? 'font-semibold text-ink' : 'text-graphite'}`}>
                <span>{label}</span>
                <span className={highlight ? 'text-ink' : ''}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Advance history */}
      {data.advances.length > 0 && (
        <div className="card-surface overflow-hidden">
          <div className="border-b border-hairline px-6 py-4">
            <h2 className="font-display text-[15px] font-semibold text-ink">Advance Requests</h2>
          </div>
          <div className="divide-y divide-hairline">
            {data.advances.map((adv) => (
              <div key={adv.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-[14px] font-medium text-ink">
                    AED {parseFloat(adv.amountRequested).toLocaleString('en-AE', { minimumFractionDigits: 0 })}
                  </p>
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
