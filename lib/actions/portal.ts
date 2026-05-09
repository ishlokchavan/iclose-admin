'use server'

import { db } from '@/db/client'
import { deals, commissionAdvances, agents } from '@/db/schema'
import { eq, desc, and, sql } from 'drizzle-orm'
import { requireRole, getProfile } from '@/lib/auth'
import { writeAudit } from '@/lib/audit'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ─── Get current agent row ────────────────────────────────────────────────────

async function getMyAgent() {
  const profile = await getProfile()
  if (!profile) return null

  return db.query.agents.findFirst({
    where: eq(agents.profileId, profile.id),
  }) ?? null
}

// ─── My deals ─────────────────────────────────────────────────────────────────

export async function getMyDeals() {
  await requireRole(['agent'])
  const agent = await getMyAgent()
  if (!agent) return []

  return db.query.deals.findMany({
    where: eq(deals.agentId, agent.id),
    orderBy: [desc(deals.createdAt)],
  })
}

// ─── My commission summary ────────────────────────────────────────────────────

export async function getMyCommission() {
  await requireRole(['agent'])
  const agent = await getMyAgent()
  if (!agent) return { earned: '0', paid: '0', pending: '0', advances: [] }

  const earned = agent.totalCommissionEarned
  const paid = agent.totalCommissionPaid
  const pending = String(
    Math.max(0, parseFloat(earned) - parseFloat(paid))
  )

  const advances = await db.query.commissionAdvances.findMany({
    where: eq(commissionAdvances.agentId, agent.id),
    orderBy: [desc(commissionAdvances.requestedAt)],
    with: {
      deal: { columns: { propertyRef: true } },
    },
  })

  return { earned, paid, pending, advances }
}

// ─── Request advance ──────────────────────────────────────────────────────────

const requestAdvanceSchema = z.object({
  dealId: z.string().uuid(),
  amountRequested: z.coerce.number().positive('Amount must be positive'),
})

export async function requestAdvance(formData: FormData) {
  await requireRole(['agent'])
  const agent = await getMyAgent()
  if (!agent) return { ok: false as const, error: 'Agent not found' }

  const parsed = requestAdvanceSchema.safeParse({
    dealId: formData.get('dealId'),
    amountRequested: formData.get('amountRequested'),
  })

  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }

  const { dealId, amountRequested } = parsed.data

  // Verify the deal belongs to this agent and is signed
  const deal = await db.query.deals.findFirst({
    where: and(eq(deals.id, dealId), eq(deals.agentId, agent.id)),
    columns: { id: true, status: true, commissionAmount: true },
  })

  if (!deal) return { ok: false as const, error: 'Deal not found' }
  if (deal.status !== 'signed') {
    return { ok: false as const, error: 'Advance can only be requested on signed deals' }
  }

  const maxAdvance = parseFloat(deal.commissionAmount)
  if (amountRequested > maxAdvance) {
    return { ok: false as const, error: `Amount cannot exceed commission of AED ${maxAdvance.toLocaleString()}` }
  }

  const [advance] = await db.insert(commissionAdvances).values({
    agentId: agent.id,
    dealId,
    amountRequested: String(amountRequested),
    status: 'requested',
  }).returning({ id: commissionAdvances.id })

  await writeAudit({
    actorId: agent.profileId ?? null,
    action: 'advance.requested',
    entity: 'commission_advances',
    entityId: advance?.id,
    after: { dealId, amountRequested },
  })

  revalidatePath('/portal/advance')
  revalidatePath('/portal/commission')
  return { ok: true as const }
}

// ─── Portal overview stats ────────────────────────────────────────────────────

export async function getPortalStats() {
  await requireRole(['agent'])
  const agent = await getMyAgent()

  if (!agent) return {
    totalDeals: 0,
    activeDeals: 0,
    commissionEarned: '0',
    commissionPaid: '0',
    pendingAdvances: 0,
  }

  const [totalDeals, activeDeals, pendingAdvances] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(deals).where(eq(deals.agentId, agent.id)),
    db.select({ count: sql<number>`count(*)` }).from(deals).where(
      and(eq(deals.agentId, agent.id), eq(deals.status, 'signed'))
    ),
    db.select({ count: sql<number>`count(*)` }).from(commissionAdvances).where(
      and(eq(commissionAdvances.agentId, agent.id), eq(commissionAdvances.status, 'requested'))
    ),
  ])

  return {
    totalDeals: Number(totalDeals[0]?.count ?? 0),
    activeDeals: Number(activeDeals[0]?.count ?? 0),
    commissionEarned: agent.totalCommissionEarned,
    commissionPaid: agent.totalCommissionPaid,
    pendingAdvances: Number(pendingAdvances[0]?.count ?? 0),
  }
}
