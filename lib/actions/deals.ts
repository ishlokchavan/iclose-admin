'use server'

import { db } from '@/db/client'
import { deals, agents, commissionAdvances } from '@/db/schema'
import { eq, desc, and, count, sql } from 'drizzle-orm'
import { requireRole } from '@/lib/auth'
import { writeAudit } from '@/lib/audit'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { headers } from 'next/headers'
import type { DealStatus } from '@/db/schema'

// ─── List deals ───────────────────────────────────────────────────────────────

export async function getDeals(filters: {
  status?: DealStatus
  agentId?: string
  page?: number
  pageSize?: number
} = {}) {
  await requireRole(['super_admin', 'agent_manager', 'auditor'])

  const { status, agentId, page = 1, pageSize = 20 } = filters
  const offset = (page - 1) * pageSize

  const conditions = []
  if (status) conditions.push(eq(deals.status, status))
  if (agentId) conditions.push(eq(deals.agentId, agentId))
  const where = conditions.length > 0 ? and(...conditions) : undefined

  const [rows, totalResult] = await Promise.all([
    db.query.deals.findMany({
      where,
      orderBy: [desc(deals.createdAt)],
      limit: pageSize,
      offset,
      with: {
        agent: { columns: { id: true, fullName: true, isLicensedAgent: true } },
      },
    }),
    db.select({ count: count() }).from(deals).where(where),
  ])

  return {
    deals: rows,
    total: totalResult[0]?.count ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((totalResult[0]?.count ?? 0) / pageSize),
  }
}

// ─── Get single deal ──────────────────────────────────────────────────────────

export async function getDeal(id: string) {
  await requireRole(['super_admin', 'agent_manager', 'auditor'])

  return db.query.deals.findFirst({
    where: eq(deals.id, id),
    with: {
      agent: { columns: { id: true, fullName: true, isLicensedAgent: true, applicationStatus: true } },
      advances: { orderBy: [desc(commissionAdvances.requestedAt)] },
    },
  }) ?? null
}

// ─── Create deal ──────────────────────────────────────────────────────────────

const createDealSchema = z.object({
  agentId: z.string().uuid(),
  propertyRef: z.string().min(1).max(256),
  amount: z.coerce.number().positive(),
  commissionRate: z.coerce.number().min(0).max(1),
})

export async function createDeal(formData: FormData) {
  const profile = await requireRole(['super_admin', 'agent_manager'])

  const parsed = createDealSchema.safeParse({
    agentId: formData.get('agentId'),
    propertyRef: formData.get('propertyRef'),
    amount: formData.get('amount'),
    commissionRate: formData.get('commissionRate'),
  })

  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }

  const { agentId, propertyRef, amount, commissionRate } = parsed.data
  const commissionAmount = amount * commissionRate

  const [deal] = await db.insert(deals).values({
    agentId,
    propertyRef,
    amount: String(amount),
    commissionRate: String(commissionRate),
    commissionAmount: String(commissionAmount),
    status: 'pending',
  }).returning({ id: deals.id })

  await writeAudit({
    actorId: profile.id,
    action: 'deal.created',
    entity: 'deals',
    entityId: deal?.id,
    after: { agentId, propertyRef, amount, commissionRate, commissionAmount },
  })

  revalidatePath('/dashboard/deals')
  return { ok: true as const, dealId: deal?.id }
}

// ─── Update deal status ───────────────────────────────────────────────────────

export async function updateDealStatus(dealId: string, newStatus: DealStatus) {
  const profile = await requireRole(['super_admin', 'agent_manager'])

  const existing = await db.query.deals.findFirst({
    where: eq(deals.id, dealId),
    columns: { id: true, status: true, agentId: true, commissionAmount: true },
  })

  if (!existing) return { ok: false as const, error: 'Deal not found' }

  const updates: Partial<typeof deals.$inferInsert> = {
    status: newStatus,
    updatedAt: new Date(),
  }

  if (newStatus === 'signed') updates.signedAt = new Date()
  if (newStatus === 'paid') updates.paidAt = new Date()

  await db.update(deals).set(updates).where(eq(deals.id, dealId))

  // Update agent total_commission_earned when deal is signed
  if (newStatus === 'signed') {
    await db.execute(
      sql`UPDATE agents SET total_commission_earned = total_commission_earned + ${existing.commissionAmount}::decimal WHERE id = ${existing.agentId}`
    )
  }

  // Update agent total_commission_paid when deal is paid
  if (newStatus === 'paid') {
    await db.execute(
      sql`UPDATE agents SET total_commission_paid = total_commission_paid + ${existing.commissionAmount}::decimal WHERE id = ${existing.agentId}`
    )
  }

  const headersList = await headers()
  await writeAudit({
    actorId: profile.id,
    action: 'deal.status_change',
    entity: 'deals',
    entityId: dealId,
    before: { status: existing.status },
    after: { status: newStatus },
    ip: headersList.get('x-forwarded-for')?.split(',')[0] ?? undefined,
  })

  revalidatePath('/dashboard/deals')
  revalidatePath(`/dashboard/deals/${dealId}`)
  return { ok: true as const }
}

// ─── Deal stats ───────────────────────────────────────────────────────────────

export async function getDealStats() {
  await requireRole(['super_admin', 'agent_manager', 'auditor'])

  const [pending, signed, paid, cancelled] = await Promise.all([
    db.select({ count: count() }).from(deals).where(eq(deals.status, 'pending')),
    db.select({ count: count() }).from(deals).where(eq(deals.status, 'signed')),
    db.select({ count: count() }).from(deals).where(eq(deals.status, 'paid')),
    db.select({ count: count() }).from(deals).where(eq(deals.status, 'cancelled')),
  ])

  const totalCommission = await db.execute(
    sql`SELECT COALESCE(SUM(commission_amount), 0) as total FROM deals WHERE status IN ('signed', 'paid')`
  )

  return {
    pending: pending[0]?.count ?? 0,
    signed: signed[0]?.count ?? 0,
    paid: paid[0]?.count ?? 0,
    cancelled: cancelled[0]?.count ?? 0,
    totalCommission: String((totalCommission as unknown as Array<{total: string}>)[0]?.total ?? '0'),
  }
}
