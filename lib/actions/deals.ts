'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { requireRole } from '@/lib/auth'
import { writeAudit } from '@/lib/audit'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { headers } from 'next/headers'
import type { DealStatus } from '@/db/schema'

export async function getDeals(filters: { status?: DealStatus; agentId?: string; page?: number; pageSize?: number } = {}) {
  await requireRole(['super_admin', 'agent_manager', 'auditor'])
  const sb = createServiceClient()
  const { status, agentId, page = 1, pageSize = 20 } = filters
  const from = (page - 1) * pageSize

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (sb as any).from('deals').select('*, agents(id, full_name, is_licensed_agent)', { count: 'exact' })
  if (status) q = q.eq('status', status)
  if (agentId) q = q.eq('agent_id', agentId)

  const { data, count } = await q.order('created_at', { ascending: false }).range(from, from + pageSize - 1)
  const total = count ?? 0
  return { deals: data ?? [], total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}

export async function getDeal(id: string) {
  await requireRole(['super_admin', 'agent_manager', 'auditor'])
  const sb = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (sb as any).from('deals')
    .select('*, agents(id, full_name, is_licensed_agent, application_status), commission_advances(*)')
    .eq('id', id).single()
  return data ?? null
}

const createDealSchema = z.object({
  agentId: z.string().uuid(),
  propertyRef: z.string().min(1).max(256),
  transactionType: z.enum(['off_plan','secondary']).default('secondary'),
  amount: z.coerce.number().positive(),
  commissionRate: z.coerce.number().min(0).max(1),
  vatAmount: z.coerce.number().min(0).default(0),
  vatIncluded: z.enum(['included','excluded']).default('excluded'),
})

export async function createDeal(formData: FormData) {
  const profile = await requireRole(['super_admin', 'agent_manager'])
  const parsed = createDealSchema.safeParse({
    agentId: formData.get('agentId'), propertyRef: formData.get('propertyRef'),
    transactionType: formData.get('transactionType'), amount: formData.get('amount'),
    commissionRate: formData.get('commissionRate'), vatAmount: formData.get('vatAmount'),
    vatIncluded: formData.get('vatIncluded'),
  })
  if (!parsed.success) return { ok: false as const, error: parsed.error.errors[0]?.message ?? 'Invalid input' }

  const { agentId, propertyRef, transactionType, amount, commissionRate, vatAmount, vatIncluded } = parsed.data
  const commissionAmount = amount * commissionRate
  const sb = createServiceClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: deal, error } = await (sb as any).from('deals').insert({
    agent_id: agentId, property_ref: propertyRef, transaction_type: transactionType,
    amount: String(amount), commission_rate: String(commissionRate),
    commission_amount: String(commissionAmount), vat_amount: String(vatAmount),
    vat_included: vatIncluded === 'included', status: 'pending',
  }).select('id').single()

  if (error || !deal) return { ok: false as const, error: 'Failed to create deal' }
  await writeAudit({ actorId: profile.id, action: 'deal.created', entity: 'deals', entityId: deal.id, after: { agentId, propertyRef, amount, commissionRate } })
  revalidatePath('/dashboard/deals')
  return { ok: true as const, dealId: deal.id }
}

export async function updateDealStatus(dealId: string, newStatus: DealStatus) {
  const profile = await requireRole(['super_admin', 'agent_manager'])
  const sb = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (sb as any).from('deals').select('id, status, agent_id, commission_amount').eq('id', dealId).single()
  if (!existing) return { ok: false as const, error: 'Deal not found' }

  const updates: Record<string, unknown> = { status: newStatus, updated_at: new Date().toISOString() }
  if (newStatus === 'signed') updates.signed_at = new Date().toISOString()
  if (newStatus === 'paid') updates.paid_at = new Date().toISOString()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (sb as any).from('deals').update(updates).eq('id', dealId)

  if (newStatus === 'signed') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: agent } = await (sb as any).from('agents').select('total_commission_earned').eq('id', existing.agent_id).single()
    const newTotal = (parseFloat(agent?.total_commission_earned ?? '0') + parseFloat(existing.commission_amount)).toFixed(2)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (sb as any).from('agents').update({ total_commission_earned: newTotal }).eq('id', existing.agent_id)
  }

  const headersList = await headers()
  await writeAudit({ actorId: profile.id, action: 'deal.status_change', entity: 'deals', entityId: dealId, before: { status: existing.status }, after: { status: newStatus }, ip: headersList.get('x-forwarded-for')?.split(',')[0] ?? undefined })
  revalidatePath('/dashboard/deals')
  revalidatePath(`/dashboard/deals/${dealId}`)
  return { ok: true as const }
}

export async function getDealStats() {
  await requireRole(['super_admin', 'agent_manager', 'auditor'])
  const sb = createServiceClient()
  const [p, s, pa, c] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sb as any).from('deals').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sb as any).from('deals').select('*', { count: 'exact', head: true }).eq('status', 'signed'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sb as any).from('deals').select('*', { count: 'exact', head: true }).eq('status', 'paid'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sb as any).from('deals').select('*', { count: 'exact', head: true }).eq('status', 'cancelled'),
  ])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: commData } = await (sb as any).from('deals').select('commission_amount').in('status', ['signed','paid'])
  const totalCommission = (commData ?? []).reduce((sum: number, d: Record<string, string>) => sum + parseFloat(d.commission_amount ?? '0'), 0).toFixed(2)
  return { pending: p.count ?? 0, signed: s.count ?? 0, paid: pa.count ?? 0, cancelled: c.count ?? 0, totalCommission }
}
