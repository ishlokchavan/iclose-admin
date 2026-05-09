'use server'

import { db } from '@/db/client'
import { commissionAdvances, agents, deals, profiles } from '@/db/schema'
import { eq, desc, and, count } from 'drizzle-orm'
import { requireRole } from '@/lib/auth'
import { writeAudit } from '@/lib/audit'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { AdvanceStatus } from '@/db/schema'

// ─── List advances ────────────────────────────────────────────────────────────

export async function getAdvances(filters: {
  status?: AdvanceStatus
  page?: number
  pageSize?: number
} = {}) {
  await requireRole(['super_admin', 'agent_manager', 'auditor'])

  const { status, page = 1, pageSize = 20 } = filters
  const offset = (page - 1) * pageSize

  const where = status ? eq(commissionAdvances.status, status) : undefined

  const [rows, totalResult] = await Promise.all([
    db.query.commissionAdvances.findMany({
      where,
      orderBy: [desc(commissionAdvances.requestedAt)],
      limit: pageSize,
      offset,
      with: {
        agent: { columns: { id: true, fullName: true } },
        deal: { columns: { id: true, propertyRef: true, commissionAmount: true } },
        decidedBy: { columns: { id: true, fullName: true } },
      },
    }),
    db.select({ count: count() }).from(commissionAdvances).where(where),
  ])

  return {
    advances: rows,
    total: totalResult[0]?.count ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((totalResult[0]?.count ?? 0) / pageSize),
  }
}

// ─── Decide advance (approve / reject) ───────────────────────────────────────

const decideSchema = z.object({
  advanceId: z.string().uuid(),
  decision: z.enum(['approved', 'rejected']),
  notes: z.string().max(500).optional(),
})

export async function decideAdvance(formData: FormData) {
  const profile = await requireRole(['super_admin', 'agent_manager'])

  const parsed = decideSchema.safeParse({
    advanceId: formData.get('advanceId'),
    decision: formData.get('decision'),
    notes: formData.get('notes') || undefined,
  })

  if (!parsed.success) {
    return { ok: false as const, error: 'Invalid input' }
  }

  const { advanceId, decision, notes } = parsed.data

  const existing = await db.query.commissionAdvances.findFirst({
    where: eq(commissionAdvances.id, advanceId),
    columns: { id: true, status: true, agentId: true },
  })

  if (!existing) return { ok: false as const, error: 'Advance not found' }
  if (existing.status !== 'requested') {
    return { ok: false as const, error: 'Advance has already been decided' }
  }

  await db.update(commissionAdvances).set({
    status: decision,
    decidedAt: new Date(),
    decidedBy: profile.id,
    notes: notes ?? null,
  }).where(eq(commissionAdvances.id, advanceId))

  await writeAudit({
    actorId: profile.id,
    action: `advance.${decision}`,
    entity: 'commission_advances',
    entityId: advanceId,
    before: { status: 'requested' },
    after: { status: decision, notes },
  })

  revalidatePath('/dashboard/commission')
  return { ok: true as const }
}

// ─── Mark advance as disbursed ────────────────────────────────────────────────

export async function disburseAdvance(advanceId: string) {
  const profile = await requireRole(['super_admin', 'agent_manager'])

  await db.update(commissionAdvances).set({
    status: 'disbursed',
    decidedAt: new Date(),
    decidedBy: profile.id,
  }).where(
    and(
      eq(commissionAdvances.id, advanceId),
      eq(commissionAdvances.status, 'approved')
    )
  )

  await writeAudit({
    actorId: profile.id,
    action: 'advance.disbursed',
    entity: 'commission_advances',
    entityId: advanceId,
    after: { status: 'disbursed' },
  })

  revalidatePath('/dashboard/commission')
  return { ok: true as const }
}
