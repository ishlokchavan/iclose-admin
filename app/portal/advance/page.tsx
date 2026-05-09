import type { Metadata } from 'next'
import { requireRole } from '@/lib/auth'
import { getMyDeals } from '@/lib/actions/portal'
import AdvanceRequestForm from './advance-form'

export const metadata: Metadata = { title: 'Request Advance' }

export default async function PortalAdvancePage() {
  await requireRole(['agent'])
  const deals = await getMyDeals()
  const signedDeals = deals.filter((d) => d.status === 'signed')

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="eyebrow mb-2">Finance</p>
        <h1 className="admin-page-title">Request Commission Advance</h1>
        <p className="mt-1 text-[14px] text-graphite">
          Request an early advance on commission from a signed deal.
        </p>
      </div>

      <div className="max-w-lg">
        <div className="card-surface p-6">
          <AdvanceRequestForm signedDeals={signedDeals} />
        </div>
      </div>
    </div>
  )
}
