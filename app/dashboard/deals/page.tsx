import type { Metadata } from 'next'
import { requireRole } from '@/lib/auth'
import { getDeals, getDealStats } from '@/lib/actions/deals'
import { DealTable } from '@/components/dashboard/deals/deal-table'
import { CreateDealDialog } from '@/components/dashboard/deals/create-deal-dialog'
import { db } from '@/db/client'
import { agents } from '@/db/schema'
import { eq } from 'drizzle-orm'
import type { DealStatus } from '@/db/schema'

export const metadata: Metadata = { title: 'Deals' }

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>
}) {
  const profile = await requireRole(['super_admin', 'agent_manager', 'auditor'])
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const status = params.status as DealStatus | undefined
  const canCreate = profile.role === 'super_admin' || profile.role === 'agent_manager'

  const [result, stats, activeAgents] = await Promise.all([
    getDeals({ status, page, pageSize: 20 }),
    getDealStats(),
    canCreate ? db.query.agents.findMany({
      where: eq(agents.applicationStatus, 'active'),
      columns: { id: true, fullName: true, isLicensedAgent: true },
      orderBy: (a, { asc }) => [asc(a.fullName)],
    }) : Promise.resolve([]),
  ])

  function formatAed(val: string) {
    return `AED ${parseFloat(val).toLocaleString('en-AE', { minimumFractionDigits: 0 })}`
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Management</p>
          <h1 className="admin-page-title">Deals</h1>
          <p className="mt-1 text-[14px] text-graphite">{result.total} deals total</p>
        </div>
        {canCreate && <CreateDealDialog agents={activeAgents} />}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Pending', value: stats.pending, color: 'text-yellow-600' },
          { label: 'Signed', value: stats.signed, color: 'text-blue-600' },
          { label: 'Paid', value: stats.paid, color: 'text-emerald-600' },
          { label: 'Total Commission', value: formatAed(stats.totalCommission), color: 'text-ink' },
        ].map((s) => (
          <div key={s.label} className="card-mist flex flex-col gap-1 p-4">
            <p className="admin-section-label">{s.label}</p>
            <p className={`font-display text-[22px] font-semibold tracking-tight ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <DealTable
        deals={result.deals}
        total={result.total}
        page={result.page}
        pageSize={result.pageSize}
        totalPages={result.totalPages}
      />
    </div>
  )
}
