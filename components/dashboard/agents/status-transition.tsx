'use client'

import { useTransition } from 'react'
import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { updateAgentStatus } from '@/lib/actions/agents'
import { VALID_STATUS_TRANSITIONS, type ApplicationStatus } from '@/db/schema'
import { cn } from '@/lib/utils'

const TRANSITION_LABELS: Partial<Record<ApplicationStatus, string>> = {
  contacted: 'Mark Contacted',
  qualified: 'Mark Qualified',
  approved:  'Approve & Invite',
  active:    'Set Active',
  rejected:  'Reject',
  inactive:  'Set Inactive',
}

const TRANSITION_VARIANTS: Partial<Record<ApplicationStatus, 'primary' | 'dark' | 'destructive' | 'secondary'>> = {
  contacted: 'secondary',
  qualified: 'secondary',
  approved:  'dark',
  active:    'primary',
  rejected:  'destructive',
  inactive:  'secondary',
}

export function StatusTransition({
  agentId,
  currentStatus,
}: {
  agentId: string
  currentStatus: ApplicationStatus
}) {
  const [isPending, startTransition] = useTransition()
  const validNext = VALID_STATUS_TRANSITIONS[currentStatus] ?? []

  if (validNext.length === 0) return null

  function handleTransition(newStatus: ApplicationStatus) {
    startTransition(async () => {
      const formData = new FormData()
      formData.set('agentId', agentId)
      formData.set('newStatus', newStatus)
      await updateAgentStatus(formData)
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {validNext.map((status) => (
        <Button
          key={status}
          variant={TRANSITION_VARIANTS[status] ?? 'secondary'}
          size="sm"
          loading={isPending}
          onClick={() => handleTransition(status)}
        >
          {TRANSITION_LABELS[status] ?? status}
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      ))}
    </div>
  )
}
