import type { Metadata } from 'next'
import { requireRole } from '@/lib/auth'
import { getAuditLogs, getAuditStats } from '@/lib/actions/audit'
import { formatDateTime } from '@/lib/utils'
import { Shield } from 'lucide-react'

export const metadata: Metadata = { title: 'Audit Log' }

const ACTION_COLORS: Record<string, string> = {
  'agent.status_change': 'badge-contacted',
  'agent.created_by_admin': 'badge-approved',
  'agent.approved_invite_sent': 'badge-active',
  'deal.created': 'badge-qualified',
  'deal.status_change': 'badge-contacted',
  'advance.approved': 'badge-active',
  'advance.rejected': 'badge-rejected',
  'advance.disbursed': 'badge-active',
  'user.invited': 'badge-approved',
  'user.role_changed': 'badge-contacted',
  'user.suspended': 'badge-rejected',
  'user.deleted': 'badge-rejected',
}

function actionColor(action: string) {
  return ACTION_COLORS[action] ?? 'badge-applied'
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; entity?: string; page?: string }>
}) {
  await requireRole(['super_admin', 'auditor'])
  const { action, entity, page: pageStr } = await searchParams
  const page = parseInt(pageStr ?? '1')

  const [{ logs, total, totalPages }, stats] = await Promise.all([
    getAuditLogs({ action, entity, page, pageSize: 50 }),
    getAuditStats(),
  ])

  const ENTITIES = ['agents', 'deals', 'commission_advances', 'profiles', 'audit_logs']

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="eyebrow mb-2">System</p>
        <h1 className="admin-page-title">Audit Log</h1>
        <p className="mt-1 text-[14px] text-graphite">{total.toLocaleString()} events total · Last 7 days: {stats.total}</p>
      </div>

      {/* Stats strip */}
      {stats.byAction.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {stats.byAction.map(([act, count]) => (
            <div key={act} className="flex items-center gap-2 rounded-lg bg-mist px-3 py-1.5">
              <span className="text-[12px] font-mono text-graphite">{act}</span>
              <span className="rounded-full bg-ink/10 px-1.5 py-0.5 text-[11px] font-semibold text-ink">{count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <form method="GET" className="flex flex-wrap items-center gap-3">
        <input
          name="action"
          defaultValue={action ?? ''}
          placeholder="Filter by action…"
          className="h-9 rounded-xl border border-hairline bg-paper px-3 text-[13px] text-ink placeholder:text-graphite-light outline-none focus:border-ink w-52"
        />
        <select name="entity" defaultValue={entity ?? ''} className="h-9 rounded-xl border border-hairline bg-paper px-3 text-[13px] text-ink">
          <option value="">All entities</option>
          {ENTITIES.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        <button type="submit" className="h-9 rounded-xl bg-ink px-4 text-[13px] font-medium text-white hover:bg-ink/90 transition-colors">
          Filter
        </button>
        {(action || entity) && (
          <a href="/dashboard/audit" className="h-9 rounded-xl border border-hairline px-4 flex items-center text-[13px] text-graphite hover:bg-mist transition-colors">
            Clear
          </a>
        )}
      </form>

      {/* Table */}
      <div className="card-surface overflow-hidden">
        <div className="grid grid-cols-[140px_1fr_1fr_140px_100px] gap-4 border-b border-hairline px-6 py-3">
          {['Time', 'Action', 'Actor', 'Entity', 'IP'].map(h => (
            <p key={h} className="admin-section-label">{h}</p>
          ))}
        </div>

        {logs.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Shield className="h-8 w-8 text-graphite-light" />
            <p className="text-[14px] text-graphite">No audit events found.</p>
          </div>
        ) : (
          <div className="divide-y divide-hairline">
            {logs.map((log: Record<string, unknown>) => (
              <div key={log.id as string} className="grid grid-cols-[140px_1fr_1fr_140px_100px] items-start gap-4 px-6 py-3 hover:bg-fog transition-colors">
                <p className="text-[12px] font-mono text-graphite-light pt-0.5">
                  {formatDateTime(log.created_at as string)}
                </p>
                <div>
                  <span className={`${actionColor(log.action as string)} text-[11px]`}>{log.action as string}</span>
                  {Boolean(log.after_json) && (
                    <p className="mt-1 font-mono text-[11px] text-graphite-light truncate max-w-xs">
                      {String(JSON.stringify(log.after_json)).slice(0, 80)}
                    </p>
                  )}
                </div>
                <p className="text-[13px] text-ink">
                  {(log.actor as Record<string, string>)?.full_name ?? 'System'}
                  <span className="block text-[11px] font-mono text-graphite-light">{String((log.actor as Record<string, string>)?.role ?? '')}</span>
                </p>
                <div>
                  <p className="text-[12px] font-mono text-graphite">{log.entity as string}</p>
                  {Boolean(log.entity_id) && (
                    <p className="text-[11px] font-mono text-graphite-light truncate">{(log.entity_id as string).slice(0, 8)}…</p>
                  )}
                </div>
                <p className="text-[12px] font-mono text-graphite-light">{String(log.ip ?? '—')}</p>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-hairline px-6 py-4">
            <p className="text-[13px] text-graphite">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              {page > 1 && (
                <a href={`?${new URLSearchParams({ ...(action ? { action } : {}), ...(entity ? { entity } : {}), page: String(page - 1) })}`}
                  className="rounded-lg border border-hairline px-3 py-1.5 text-[13px] hover:bg-mist">← Prev</a>
              )}
              {page < totalPages && (
                <a href={`?${new URLSearchParams({ ...(action ? { action } : {}), ...(entity ? { entity } : {}), page: String(page + 1) })}`}
                  className="rounded-lg border border-hairline px-3 py-1.5 text-[13px] hover:bg-mist">Next →</a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
