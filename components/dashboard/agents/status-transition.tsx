'use client'

import { useTransition, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { updateAgentStatus } from '@/lib/actions/agents'
import { APPLICATION_STATUSES, type ApplicationStatus } from '@/db/schema'
import { cn } from '@/lib/utils'

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  applied:   'Applied',
  contacted: 'Contacted',
  qualified: 'Qualified',
  approved:  'Approved',
  active:    'Active',
  rejected:  'Rejected',
  inactive:  'Inactive',
}

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  applied:   'bg-blue-50 text-blue-700 border-blue-200',
  contacted: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  qualified: 'bg-purple-50 text-purple-700 border-purple-200',
  approved:  'bg-green-50 text-green-700 border-green-200',
  active:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected:  'bg-red-50 text-red-700 border-red-200',
  inactive:  'bg-gray-100 text-gray-500 border-gray-200',
}

export function StatusTransition({
  agentId,
  currentStatus,
}: {
  agentId: string
  currentStatus: ApplicationStatus
}) {
  const [isPending, startTransition] = useTransition()
  const [isOpen, setIsOpen] = useState(false)

  const otherStatuses = APPLICATION_STATUSES.filter((s) => s !== currentStatus)

  function handleSelect(newStatus: ApplicationStatus) {
    setIsOpen(false)
    startTransition(async () => {
      const formData = new FormData()
      formData.set('agentId', agentId)
      formData.set('newStatus', newStatus)
      await updateAgentStatus(formData)
    })
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen((v) => !v)}
        disabled={isPending}
        className={cn(
          'flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-semibold transition-all',
          STATUS_COLORS[currentStatus],
          isPending && 'opacity-60 cursor-wait',
          'hover:shadow-sm'
        )}
      >
        {isPending ? 'Updating…' : STATUS_LABELS[currentStatus]}
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          {/* Dropdown */}
          <div className="absolute right-0 top-full z-20 mt-1.5 w-44 overflow-hidden rounded-xl border border-hairline bg-paper shadow-elevated">
            <div className="px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-graphite-light">
                Move to
              </p>
            </div>
            <div className="pb-1.5">
              {otherStatuses.map((status) => (
                <button
                  key={status}
                  onClick={() => handleSelect(status)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-mist"
                >
                  <span className={cn(
                    'inline-flex h-2 w-2 shrink-0 rounded-full',
                    status === 'active'   ? 'bg-emerald-500' :
                    status === 'approved' ? 'bg-green-500' :
                    status === 'rejected' ? 'bg-red-500' :
                    status === 'inactive' ? 'bg-gray-400' :
                    status === 'qualified'? 'bg-purple-500' :
                    status === 'contacted'? 'bg-yellow-500' :
                    'bg-blue-500'
                  )} />
                  <span className="text-[13px] text-ink">{STATUS_LABELS[status]}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
