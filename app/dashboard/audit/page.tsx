import type { Metadata } from 'next'
import { requireRole } from '@/lib/auth'
import { ShieldCheck } from 'lucide-react'

export const metadata: Metadata = { title: 'Audit Log' }

export default async function AuditPage() {
  await requireRole(['super_admin', 'auditor'])
  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="eyebrow mb-2">System</p>
        <h1 className="admin-page-title">Audit Log</h1>
        <p className="mt-1 text-[14px] text-graphite">Full immutable log of every mutation — who, what, before, after.</p>
      </div>
      <div className="card-surface flex flex-col items-center gap-4 py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-mist">
          <ShieldCheck className="h-6 w-6 text-graphite-light" />
        </div>
        <div>
          <p className="font-display text-[17px] font-semibold text-ink">Coming in Phase 7</p>
          <p className="mt-1 max-w-sm text-[14px] text-graphite">Filterable audit trail with actor, action, entity, timestamp, and diff viewer.</p>
        </div>
        <div className="mt-2 rounded-xl border border-accent/20 bg-accent/5 px-5 py-3">
          <p className="text-[13px] font-medium text-accent">Phase 7 — Audit log viewer</p>
        </div>
      </div>
    </div>
  )
}
