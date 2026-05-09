'use client'

import { useTransition } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { decideAdvance } from '@/lib/actions/commission'
import { formatDate } from '@/lib/utils'
import type { CommissionAdvance, Agent, Deal } from '@/db/schema'

type AdvanceRow = CommissionAdvance & {
  agent: Pick<Agent, 'id' | 'fullName'>
  deal: Pick<Deal, 'propertyRef' | 'commissionAmount'> | null
  decidedBy: { id: string; fullName: string } | null
}

export default function AdvancesQueue({ advances }: { advances: AdvanceRow[] }) {
  const [isPending, startTransition] = useTransition()

  function decide(advanceId: string, decision: 'approved' | 'rejected') {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('advanceId', advanceId)
      fd.set('decision', decision)
      await decideAdvance(fd)
    })
  }

  function formatAed(val: string) {
    return `AED ${parseFloat(val).toLocaleString('en-AE', { minimumFractionDigits: 0 })}`
  }

  if (advances.length === 0) {
    return (
      <div className="card-surface flex flex-col items-center gap-3 py-20 text-center">
        <CheckCircle2 className="h-10 w-10 text-emerald-400" />
        <div>
          <p className="font-display text-[17px] font-semibold text-ink">All clear</p>
          <p className="mt-1 text-[14px] text-graphite">No pending advance requests.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card-surface overflow-hidden">
      <div className="grid grid-cols-[2fr_2fr_1fr_1fr_120px] gap-4 border-b border-hairline px-6 py-3">
        {['Agent', 'Property', 'Requested', 'Max Commission', 'Action'].map((h) => (
          <p key={h} className="admin-section-label">{h}</p>
        ))}
      </div>
      <div className="divide-y divide-hairline">
        {advances.map((adv) => (
          <div key={adv.id} className="grid grid-cols-[2fr_2fr_1fr_1fr_120px] items-center gap-4 px-6 py-4">
            <div>
              <p className="text-[14px] font-medium text-ink">{adv.agent.fullName}</p>
              <p className="text-[12px] text-graphite">{formatDate(adv.requestedAt)}</p>
            </div>
            <p className="truncate text-[13px] text-graphite">{adv.deal?.propertyRef ?? '—'}</p>
            <p className="text-[14px] font-semibold text-ink">{formatAed(adv.amountRequested)}</p>
            <p className="text-[13px] text-graphite">
              {adv.deal ? formatAed(adv.deal.commissionAmount) : '—'}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="primary" size="sm"
                loading={isPending}
                onClick={() => decide(adv.id, 'approved')}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="destructive" size="sm"
                loading={isPending}
                onClick={() => decide(adv.id, 'rejected')}
              >
                <XCircle className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
