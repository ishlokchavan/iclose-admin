'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { requireRole } from '@/lib/auth'

const sb = () => createServiceClient()

export async function getAuditLogs(filters: {
  action?: string
  entity?: string
  actorId?: string
  page?: number
  pageSize?: number
} = {}) {
  await requireRole(['super_admin', 'auditor'])

  const { action, entity, actorId, page = 1, pageSize = 50 } = filters
  const from = (page - 1) * pageSize

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (sb() as any)
    .from('audit_logs')
    .select('*, actor:profiles!audit_logs_actor_id_fkey(id, full_name, role)', { count: 'exact' })

  if (action) q = q.ilike('action', `%${action}%`)
  if (entity) q = q.eq('entity', entity)
  if (actorId) q = q.eq('actor_id', actorId)

  const { data, count } = await q
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1)

  return {
    logs: data ?? [],
    total: count ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((count ?? 0) / pageSize),
  }
}

export async function getAuditStats() {
  await requireRole(['super_admin', 'auditor'])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (sb() as any)
    .from('audit_logs')
    .select('action, created_at')
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })

  const logs = data ?? []
  const byAction: Record<string, number> = {}
  for (const log of logs) {
    byAction[log.action] = (byAction[log.action] ?? 0) + 1
  }

  return {
    total: logs.length,
    byAction: Object.entries(byAction)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10),
  }
}
