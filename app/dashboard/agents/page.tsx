import type { Metadata } from 'next'
import { requireRole } from '@/lib/auth'
import { Users } from 'lucide-react'

export const metadata: Metadata = { title: 'Agents' }

export default async function AgentsPage() {
  await requireRole(['super_admin', 'agent_manager', 'auditor'])
  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="eyebrow mb-2">Management</p>
        <h1 className="admin-page-title">Agents</h1>
        <p className="mt-1 text-[14px] text-graphite">Review applications, manage active agents, track status transitions.</p>
      </div>
      <div className="card-surface flex flex-col items-center gap-4 py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-mist">
          <Users className="h-6 w-6 text-graphite-light" />
        </div>
        <div>
          <p className="font-display text-[17px] font-semibold text-ink">Coming in Phase 4</p>
          <p className="mt-1 max-w-sm text-[14px] text-graphite">Full agent list with filters, status transitions, internal notes, status history timeline, and approval flow.</p>
        </div>
        <div className="mt-2 rounded-xl border border-accent/20 bg-accent/5 px-5 py-3">
          <p className="text-[13px] font-medium text-accent">Phase 4 — Agents module + POST /api/agent/register</p>
        </div>
      </div>
    </div>
  )
}
