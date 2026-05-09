'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { requireRole, getProfile } from '@/lib/auth'
import { writeAudit } from '@/lib/audit'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

async function getMyAgent() {
  const profile = await getProfile()
  if (!profile) return null
  const sb = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (sb as any).from('agents').select('*').eq('profile_id', profile.id).single()
  return data ?? null
}

export async function getMyDeals() {
  await requireRole(['agent'])
  const agent = await getMyAgent()
  if (!agent) return []
  const sb = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (sb as any).from('deals').select('*').eq('agent_id', agent.id).order('created_at', { ascending: false })
  return data ?? []
}

export async function getMyCommission() {
  await requireRole(['agent'])
  const agent = await getMyAgent()
  if (!agent) return { earned: '0', paid: '0', pending: '0', advances: [] }

  const earned = agent.total_commission_earned ?? '0'
  const paid = agent.total_commission_paid ?? '0'
  const pending = String(Math.max(0, parseFloat(earned) - parseFloat(paid)))

  const sb = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: advances } = await (sb as any).from('commission_advances')
    .select('*, deal:deals(property_ref)')
    .eq('agent_id', agent.id).order('requested_at', { ascending: false })

  return { earned, paid, pending, advances: advances ?? [] }
}

export async function requestAdvance(formData: FormData) {
  await requireRole(['agent'])
  const agent = await getMyAgent()
  if (!agent) return { ok: false as const, error: 'Agent not found' }

  const parsed = z.object({
    dealId: z.string().uuid(),
    amountRequested: z.coerce.number().positive(),
  }).safeParse({ dealId: formData.get('dealId'), amountRequested: formData.get('amountRequested') })

  if (!parsed.success) return { ok: false as const, error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  const { dealId, amountRequested } = parsed.data

  const sb = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: deal } = await (sb as any).from('deals').select('id, status, commission_amount').eq('id', dealId).eq('agent_id', agent.id).single()
  if (!deal) return { ok: false as const, error: 'Deal not found' }
  if (deal.status !== 'signed') return { ok: false as const, error: 'Advance can only be requested on signed deals' }
  if (amountRequested > parseFloat(deal.commission_amount)) return { ok: false as const, error: `Amount cannot exceed AED ${parseFloat(deal.commission_amount).toLocaleString()}` }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: advance } = await (sb as any).from('commission_advances').insert({
    agent_id: agent.id, deal_id: dealId, amount_requested: String(amountRequested), status: 'requested',
  }).select('id').single()

  await writeAudit({ actorId: agent.profile_id ?? null, action: 'advance.requested', entity: 'commission_advances', entityId: advance?.id, after: { dealId, amountRequested } })
  revalidatePath('/portal/advance')
  revalidatePath('/portal/commission')
  return { ok: true as const }
}

export async function getPortalStats() {
  await requireRole(['agent'])
  const agent = await getMyAgent()
  if (!agent) return { totalDeals: 0, activeDeals: 0, commissionEarned: '0', commissionPaid: '0', pendingAdvances: 0 }

  const sb = createServiceClient()
  const [total, active, pending] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sb as any).from('deals').select('*', { count: 'exact', head: true }).eq('agent_id', agent.id),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sb as any).from('deals').select('*', { count: 'exact', head: true }).eq('agent_id', agent.id).eq('status', 'signed'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sb as any).from('commission_advances').select('*', { count: 'exact', head: true }).eq('agent_id', agent.id).eq('status', 'requested'),
  ])

  return {
    totalDeals: total.count ?? 0, activeDeals: active.count ?? 0,
    commissionEarned: agent.total_commission_earned ?? '0',
    commissionPaid: agent.total_commission_paid ?? '0',
    pendingAdvances: pending.count ?? 0,
  }
}
