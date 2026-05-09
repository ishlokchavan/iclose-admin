'use server'

import { db } from '@/db/client'
import {
  agents, agentNotes, agentStatusHistory, profiles,
  VALID_STATUS_TRANSITIONS,
  type ApplicationStatus,
} from '@/db/schema'
import { eq, desc, and, ilike, sql, count } from 'drizzle-orm'
import { requireRole } from '@/lib/auth'
import { writeAudit } from '@/lib/audit'
import { sendAgentApprovalEmail } from '@/lib/email'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { headers } from 'next/headers'

// ─── Types ────────────────────────────────────────────────────────────────────

export type AgentFilter = {
  status?: ApplicationStatus
  search?: string
  isLicensed?: boolean
  page?: number
  pageSize?: number
}

// ─── List agents ──────────────────────────────────────────────────────────────

export async function getAgents(filters: AgentFilter = {}) {
  await requireRole(['super_admin', 'agent_manager', 'auditor', 'content_manager'])

  const { status, search, isLicensed, page = 1, pageSize = 20 } = filters
  const offset = (page - 1) * pageSize

  const conditions = []
  if (status) conditions.push(eq(agents.applicationStatus, status))
  if (isLicensed !== undefined) conditions.push(eq(agents.isLicensedAgent, isLicensed))
  if (search) conditions.push(ilike(agents.fullName, `%${search}%`))

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const [rows, totalResult] = await Promise.all([
    db.query.agents.findMany({
      where,
      orderBy: [desc(agents.appliedAt)],
      limit: pageSize,
      offset,
      columns: {
        id: true,
        fullName: true,
        applicationStatus: true,
        isLicensedAgent: true,
        dealVolume: true,
        source: true,
        appliedAt: true,
        approvedAt: true,
        assignedTo: true,
        kycStatus: true,
        totalCommissionEarned: true,
      },
      with: {
        assignedTo: {
          columns: { id: true, fullName: true },
        },
      },
    }),
    db.select({ count: count() }).from(agents).where(where),
  ])

  return {
    agents: rows,
    total: totalResult[0]?.count ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((totalResult[0]?.count ?? 0) / pageSize),
  }
}

// ─── Get single agent ─────────────────────────────────────────────────────────

export async function getAgent(id: string) {
  await requireRole(['super_admin', 'agent_manager', 'auditor', 'content_manager'])

  const agent = await db.query.agents.findFirst({
    where: eq(agents.id, id),
    with: {
      notes: {
        orderBy: [desc(agentNotes.createdAt)],
        with: {
          author: { columns: { id: true, fullName: true, role: true } },
        },
      },
      statusHistory: {
        orderBy: [desc(agentStatusHistory.changedAt)],
        with: {
          changedBy: { columns: { id: true, fullName: true } },
        },
      },
      assignedTo: {
        columns: { id: true, fullName: true, role: true },
      },
    },
  })

  return agent ?? null
}

// ─── Update agent status ──────────────────────────────────────────────────────

const updateStatusSchema = z.object({
  agentId: z.string().uuid(),
  newStatus: z.enum(['applied', 'contacted', 'qualified', 'approved', 'active', 'rejected', 'inactive']),
  reason: z.string().max(500).optional(),
})

export async function updateAgentStatus(formData: FormData) {
  const profile = await requireRole(['super_admin', 'agent_manager'])

  const parsed = updateStatusSchema.safeParse({
    agentId: formData.get('agentId'),
    newStatus: formData.get('newStatus'),
    reason: formData.get('reason') || undefined,
  })

  if (!parsed.success) {
    return { ok: false as const, error: 'Invalid input' }
  }

  const { agentId, newStatus, reason } = parsed.data

  // Fetch current agent
  const agent = await db.query.agents.findFirst({
    where: eq(agents.id, agentId),
    columns: { id: true, applicationStatus: true, fullName: true, emailEncrypted: true },
  })

  if (!agent) return { ok: false as const, error: 'Agent not found' }

  // Validate transition
  const validNext = VALID_STATUS_TRANSITIONS[agent.applicationStatus]
  if (!validNext.includes(newStatus)) {
    return {
      ok: false as const,
      error: `Cannot transition from ${agent.applicationStatus} to ${newStatus}`,
    }
  }

  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
  const ua = headersList.get('user-agent') ?? null

  // Update agent status
  await db
    .update(agents)
    .set({ applicationStatus: newStatus, updatedAt: new Date() })
    .where(eq(agents.id, agentId))

  // Write status history row manually (trigger also does this — belt and suspenders)
  await db.insert(agentStatusHistory).values({
    agentId,
    fromStatus: agent.applicationStatus,
    toStatus: newStatus,
    changedBy: profile.id,
    reason: reason ?? null,
  })

  // Audit log
  await writeAudit({
    actorId: profile.id,
    action: 'agent.status_change',
    entity: 'agents',
    entityId: agentId,
    before: { applicationStatus: agent.applicationStatus },
    after: { applicationStatus: newStatus, reason },
    ip: ip ?? undefined,
    ua: ua ?? undefined,
  })

  // On approved → send Supabase Auth invite
  if (newStatus === 'approved') {
    await approveAgentAuth(agentId, profile.id)
  }

  revalidatePath('/dashboard/agents')
  revalidatePath(`/dashboard/agents/${agentId}`)

  return { ok: true as const }
}

// ─── Approve agent — send auth invite ────────────────────────────────────────

async function approveAgentAuth(agentId: string, actorId: string) {
  const agent = await db.query.agents.findFirst({
    where: eq(agents.id, agentId),
    columns: { id: true, fullName: true, emailEncrypted: true, profileId: true },
  })

  if (!agent || !agent.emailEncrypted) return

  // Decrypt email (stub in Phase 2 — real decrypt in Phase 4+ with Vault)
  const { decrypt } = await import('@/lib/encryption')
  let email: string
  try {
    email = await decrypt(agent.emailEncrypted)
  } catch {
    console.error('[approveAgent] Failed to decrypt email for agent', agentId)
    return
  }

  // Skip if already has a profile (already invited)
  if (agent.profileId) return

  const supabase = await createClient()

  // Send Supabase Auth invite
  const { data: inviteData, error: inviteError } =
    await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_ADMIN_URL}/update-password`,
      data: { full_name: agent.fullName, role: 'agent' },
    })

  if (inviteError || !inviteData.user) {
    console.error('[approveAgent] Invite failed:', inviteError?.message)
    return
  }

  const userId = inviteData.user.id

  // Create profile row
  await db.insert(profiles).values({
    id: userId,
    fullName: agent.fullName,
    role: 'agent',
    status: 'active',
  }).onConflictDoNothing()

  // Link profile_id on agent row
  await db.update(agents).set({ profileId: userId }).where(eq(agents.id, agentId))

  // Send supplemental approval email
  try {
    await sendAgentApprovalEmail(email, agent.fullName)
  } catch (err) {
    console.error('[approveAgent] Approval email failed:', err)
  }

  await writeAudit({
    actorId,
    action: 'agent.approved_invite_sent',
    entity: 'agents',
    entityId: agentId,
    after: { email: '***', profileId: userId },
  })
}

// ─── Assign agent ─────────────────────────────────────────────────────────────

export async function assignAgent(agentId: string, assignToProfileId: string | null) {
  const profile = await requireRole(['super_admin', 'agent_manager'])

  await db
    .update(agents)
    .set({ assignedTo: assignToProfileId, updatedAt: new Date() })
    .where(eq(agents.id, agentId))

  await writeAudit({
    actorId: profile.id,
    action: 'agent.assigned',
    entity: 'agents',
    entityId: agentId,
    after: { assignedTo: assignToProfileId },
  })

  revalidatePath(`/dashboard/agents/${agentId}`)
  return { ok: true as const }
}

// ─── Add internal note ────────────────────────────────────────────────────────

const noteSchema = z.object({
  agentId: z.string().uuid(),
  body: z.string().min(1).max(2000),
})

export async function addAgentNote(formData: FormData) {
  const profile = await requireRole(['super_admin', 'agent_manager'])

  const parsed = noteSchema.safeParse({
    agentId: formData.get('agentId'),
    body: formData.get('body'),
  })

  if (!parsed.success) {
    return { ok: false as const, error: 'Invalid input' }
  }

  await db.insert(agentNotes).values({
    agentId: parsed.data.agentId,
    authorId: profile.id,
    body: parsed.data.body,
  })

  await writeAudit({
    actorId: profile.id,
    action: 'agent.note_added',
    entity: 'agent_notes',
    entityId: parsed.data.agentId,
    after: { body: parsed.data.body.slice(0, 100) },
  })

  revalidatePath(`/dashboard/agents/${parsed.data.agentId}`)
  return { ok: true as const }
}

// ─── Get agent managers (for assignment picker) ───────────────────────────────

export async function getAgentManagers() {
  await requireRole(['super_admin', 'agent_manager'])

  return db.query.profiles.findMany({
    where: sql`${profiles.role} IN ('super_admin', 'agent_manager') AND ${profiles.status} = 'active'`,
    columns: { id: true, fullName: true, role: true },
    orderBy: [profiles.fullName],
  })
}
