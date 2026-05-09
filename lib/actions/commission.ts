'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { requireRole } from '@/lib/auth'
import { writeAudit } from '@/lib/audit'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { AdvanceStatus } from '@/db/schema'

export async function getAdvances(filters: { status?: AdvanceStatus; page?: number; pageSize?: number } = {}) {
  await requireRole(['super_admin', 'agent_manager', 'auditor'])
  const sb = createServiceClient()
  const { status, page = 1, pageSize = 20 } = filters
  const from = (page - 1) * pageSize

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (sb as any).from('commission_advances').select(`
    *, agent:agents(id, full_name),
    deal:deals(id, property_ref, commission_amount),
    decidedBy:profiles!commission_advances_decided_by_fkey(id, full_name)
  `, { count: 'exact' })
  if (status) q = q.eq('status', status)

  const { data, count } = await q.order('requested_at', { ascending: false }).range(from, from + pageSize - 1)
  const total = count ?? 0
  return { advances: data ?? [], total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}

export async function decideAdvance(formData: FormData) {
  const profile = await requireRole(['super_admin', 'agent_manager'])
  const parsed = z.object({
    advanceId: z.string().uuid(),
    decision: z.enum(['approved','rejected']),
    notes: z.string().max(500).optional(),
  }).safeParse({ advanceId: formData.get('advanceId'), decision: formData.get('decision'), notes: formData.get('notes') || undefined })

  if (!parsed.success) return { ok: false as const, error: 'Invalid input' }
  const { advanceId, decision, notes } = parsed.data
  const sb = createServiceClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (sb as any).from('commission_advances').update({
    status: decision, decided_at: new Date().toISOString(), decided_by: profile.id, notes: notes ?? null,
  }).eq('id', advanceId).eq('status', 'requested')

  await writeAudit({ actorId: profile.id, action: `advance.${decision}`, entity: 'commission_advances', entityId: advanceId, after: { status: decision } })
  revalidatePath('/dashboard/commission')
  return { ok: true as const }
}

export async function disburseAdvance(advanceId: string) {
  const profile = await requireRole(['super_admin', 'agent_manager'])
  const sb = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (sb as any).from('commission_advances').update({
    status: 'disbursed', decided_at: new Date().toISOString(), decided_by: profile.id,
  }).eq('id', advanceId).eq('status', 'approved')
  await writeAudit({ actorId: profile.id, action: 'advance.disbursed', entity: 'commission_advances', entityId: advanceId, after: { status: 'disbursed' } })
  revalidatePath('/dashboard/commission')
  return { ok: true as const }
}
