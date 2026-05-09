import type { Metadata } from 'next'
import { requireRole } from '@/lib/auth'
import { getAgents } from '@/lib/actions/agents'
import { AgentTable } from '@/components/dashboard/agents/agent-table'
import { CreateAgentDialog } from '@/components/dashboard/agents/create-agent-dialog'
import { Suspense } from 'react'
import type { ApplicationStatus } from '@/db/schema'

export const metadata: Metadata = { title: 'Agents' }

export default async function AgentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; page?: string }>
}) {
  const profile = await requireRole(['super_admin', 'agent_manager', 'auditor', 'content_manager'])
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const status = params.status as ApplicationStatus | undefined
  const search = params.search

  const result = await getAgents({ status, search, page, pageSize: 20 })
  const canCreate = profile.role === 'super_admin' || profile.role === 'agent_manager'

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Management</p>
          <h1 className="admin-page-title">Agents</h1>
          <p className="mt-1 text-[14px] text-graphite">
            {result.total} agent{result.total !== 1 ? 's' : ''} total
            {status ? ` · filtered by ${status}` : ''}
          </p>
        </div>
        {canCreate && <CreateAgentDialog />}
      </div>

      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-mist" />}>
        <AgentTable
          agents={result.agents}
          total={result.total}
          page={result.page}
          pageSize={result.pageSize}
          totalPages={result.totalPages}
        />
      </Suspense>
    </div>
  )
}
