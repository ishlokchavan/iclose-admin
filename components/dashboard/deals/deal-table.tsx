'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { ArrowRight, ChevronDown } from 'lucide-react'
import { updateDealStatus } from '@/lib/actions/deals'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { DealStatus } from '@/db/schema'

type DealRow = {
  id: string
  agent_id: string
  property_ref: string
  amount: string
  commission_amount: string
  status: string
  created_at: string
  agents?: { id: string; full_name: string; is_licensed_agent: boolean } | null
  agent?: { id: string; fullName: string; isLicensedAgent: boolean } | null
}

const STATUS_STYLES: Record<DealStatus, string> = {
  pending:   'bg-yellow-50 text-yellow-700',
  signed:    'bg-blue-50 text-blue-700',
  paid:      'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-red-50 text-red-700',
}

const ALL_STATUSES: DealStatus[] = ['pending', 'signed', 'paid', 'cancelled']

function StatusDropdown({ deal }: { deal: DealRow }) {
  const [isPending, startTransition] = useTransition()

  return (
    <select
      value={deal.status}
      disabled={isPending}
      onChange={(e) => {
        const newStatus = e.target.value as DealStatus
        startTransition(async () => {
          await updateDealStatus(deal.id, newStatus)
        })
      }}
      className={cn(
        'rounded-full border-0 px-3 py-1 text-[12px] font-semibold focus:ring-2 focus:ring-accent/30',
        STATUS_STYLES[deal.status],
        isPending && 'opacity-60'
      )}
    >
      {ALL_STATUSES.map((s) => (
        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
      ))}
    </select>
  )
}

export function DealTable({
  deals,
  total,
  page,
  pageSize,
  totalPages,
}: {
  deals: DealRow[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const currentStatus = searchParams.get('status') as DealStatus | null

  function setStatus(status: DealStatus | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (status) params.set('status', status)
    else params.delete('status')
    params.delete('page')
    startTransition(() => router.push(`${pathname}?${params.toString()}`))
  }

  function formatAed(val: string) {
    return `AED ${parseFloat(val).toLocaleString('en-AE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Status filter pills */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setStatus(null)}
          className={cn('rounded-full px-3 py-1 text-[12px] font-medium transition-colors',
            !currentStatus ? 'bg-ink text-white' : 'bg-mist text-graphite hover:bg-hairline'
          )}
        >All ({total})</button>
        {ALL_STATUSES.map((s) => (
          <button key={s} onClick={() => setStatus(s)}
            className={cn('rounded-full px-3 py-1 text-[12px] font-medium capitalize transition-colors',
              currentStatus === s ? 'bg-ink text-white' : 'bg-mist text-graphite hover:bg-hairline'
            )}
          >{s}</button>
        ))}
      </div>

      {/* Table */}
      <div className="card-surface overflow-hidden">
        {deals.length === 0 ? (
          <div className="py-16 text-center text-[14px] text-graphite">No deals found.</div>
        ) : (
          <>
            <div className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr_1fr] gap-4 border-b border-hairline px-6 py-3">
              {['Agent', 'Property', 'Amount', 'Commission', 'Status', 'Date'].map((h) => (
                <p key={h} className="admin-section-label">{h}</p>
              ))}
            </div>
            <div className="divide-y divide-hairline">
              {deals.map((deal) => (
                <div key={deal.id} className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr_1fr] items-center gap-4 px-6 py-4">
                  <Link href={`/dashboard/agents/${(deal.agents as any)?.id}`}
                    className="truncate text-[13px] font-medium text-accent hover:underline">
                    {(deal.agents as any)?.full_name}
                  </Link>
                  <Link href={`/dashboard/deals/${deal.id}`}
                    className="truncate text-[13px] text-ink hover:text-accent">
                    {deal.property_ref}
                  </Link>
                  <span className="text-[13px] font-medium text-ink">{formatAed(deal.amount)}</span>
                  <span className="text-[13px] text-graphite">{formatAed(deal.commission_amount)}</span>
                  <StatusDropdown deal={deal} />
                  <span className="text-[12px] text-graphite">{formatDate(deal.created_at)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-graphite">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button key={p} onClick={() => {
                const params = new URLSearchParams(searchParams.toString())
                params.set('page', String(p))
                startTransition(() => router.push(`${pathname}?${params.toString()}`))
              }}
                className={cn('h-8 w-8 rounded-lg text-[13px] transition-colors',
                  p === page ? 'bg-ink text-white' : 'bg-mist text-graphite hover:bg-hairline'
                )}
              >{p}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
