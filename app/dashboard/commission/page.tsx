import type { Metadata } from 'next'
import { requireRole } from '@/lib/auth'
import { getAdvances } from '@/lib/actions/commission'
import AdvancesQueue from './advances-queue'

export const metadata: Metadata = { title: 'Commission' }

export default async function CommissionPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>
}) {
  await requireRole(['super_admin', 'agent_manager', 'auditor'])

  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10))

  const result = await getAdvances({ status: 'requested', page, pageSize: 20 })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="eyebrow mb-2">Finance</p>
        <h1 className="admin-page-title">Commission Advances</h1>
        <p className="mt-1 text-[14px] text-graphite">
          {result.total} pending request{result.total !== 1 ? 's' : ''} awaiting decision
        </p>
      </div>
      <AdvancesQueue advances={result.advances} />
    </div>
  )
}
