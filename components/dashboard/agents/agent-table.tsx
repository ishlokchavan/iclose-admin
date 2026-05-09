'use client'

import { useState, useTransition, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Search, ArrowRight, ChevronLeft, ChevronRight, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusBadge } from './status-badge'
import { formatDate } from '@/lib/utils'
import { APPLICATION_STATUSES, type ApplicationStatus } from '@/db/schema'
import { cn } from '@/lib/utils'

type AgentRow = {
  id: string
  full_name: string
  application_status: string
  is_licensed_agent: boolean
  deal_volume: string | null
  source: string | null
  applied_at: string
  kyc_status: string
}

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  applied:   'Applied',
  contacted: 'Contacted',
  qualified: 'Qualified',
  approved:  'Approved',
  active:    'Active',
  rejected:  'Rejected',
  inactive:  'Inactive',
}

export function AgentTable({
  agents,
  total,
  page,
  pageSize,
  totalPages,
}: {
  agents: AgentRow[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const currentStatus = searchParams.get('status') as ApplicationStatus | null
  const currentSearch = searchParams.get('search') ?? ''
  const [searchValue, setSearchValue] = useState(currentSearch)

  const updateParams = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    })
    params.delete('page') // reset page on filter change
    startTransition(() => router.push(`${pathname}?${params.toString()}`))
  }, [searchParams, pathname, router])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    updateParams({ search: searchValue })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite-light" />
            <Input
              type="text"
              placeholder="Search agents…"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="h-9 w-56 pl-9 text-[13px]"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">Search</Button>
        </form>

        {/* Status filter pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => updateParams({ status: null })}
            className={cn(
              'rounded-full px-3 py-1 text-[12px] font-medium transition-colors',
              !currentStatus ? 'bg-ink text-white' : 'bg-mist text-graphite hover:bg-hairline'
            )}
          >
            All ({total})
          </button>
          {APPLICATION_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => updateParams({ status: s })}
              className={cn(
                'rounded-full px-3 py-1 text-[12px] font-medium transition-colors',
                currentStatus === s ? 'bg-ink text-white' : 'bg-mist text-graphite hover:bg-hairline'
              )}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card-surface overflow-hidden">
        {agents.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Filter className="h-8 w-8 text-graphite-light" />
            <div>
              <p className="text-[14px] font-medium text-ink">No agents found</p>
              <p className="mt-0.5 text-[13px] text-graphite">Try adjusting your filters.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_40px] gap-4 border-b border-hairline px-6 py-3">
              {['Agent', 'Type', 'Status', 'KYC', 'Applied', ''].map((h) => (
                <p key={h} className="admin-section-label">{h}</p>
              ))}
            </div>

            {/* Rows */}
            <div className="divide-y divide-hairline">
              {agents.map((agent) => (
                <Link
                  key={agent.id}
                  href={`/dashboard/agents/${agent.id}`}
                  className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_40px] items-center gap-4 px-6 py-4 transition-colors hover:bg-fog"
                >
                  {/* Name */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink/90">
                      <span className="text-[12px] font-semibold text-white">
                        {agent.full_name.charAt(0)}
                      </span>
                    </div>
                    <span className="truncate text-[14px] font-medium text-ink">{agent.full_name}</span>
                  </div>

                  {/* Type */}
                  <span className="text-[13px] text-graphite">
                    {agent.is_licensed_agent ? 'Licensed' : 'Connector'}
                  </span>

                  {/* Status */}
                  <StatusBadge status={agent.application_status as any} />

                  {/* KYC */}
                  <span className={cn(
                    'text-[12px] font-medium capitalize',
                    (agent.kyc_status as string) === 'verified' ? 'text-green-600' :
                    (agent.kyc_status as string) === 'rejected' ? 'text-red-600' : 'text-graphite'
                  )}>
                    {String(agent.kyc_status).replace('_', ' ')}
                  </span>

                  {/* Date */}
                  <span className="text-[12px] text-graphite">{formatDate(agent.applied_at)}</span>

                  {/* Arrow */}
                  <ArrowRight className="h-4 w-4 text-graphite-light" />
                </Link>
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
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1 || isPending}
              onClick={() => updateParams({ page: String(page - 1) })}
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>
            <span className="text-[13px] text-graphite">{page} / {totalPages}</span>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages || isPending}
              onClick={() => updateParams({ page: String(page + 1) })}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
