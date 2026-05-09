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

  const { createClient: createServiceClient } = await import('@supabase/supabase-js')
  const supabaseAdmin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Send Supabase Auth invite
  const { data: inviteData, error: inviteError } =
    await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
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

// ─── Create agent by admin ────────────────────────────────────────────────────

const createAgentSchema = z.object({
  fullName: z.string().min(2).max(128),
  email: z.string().email(),
  phone: z.string().min(7).max(32),
  isLicensedAgent: z.enum(['true', 'false']).transform((v) => v === 'true'),
  dealVolume: z.enum(['0-1', '1-3', '3-5', '5-10', '10+']).optional(),
  initialStatus: z.enum(['applied', 'contacted', 'qualified', 'approved', 'active']).default('applied'),
  source: z.string().max(128).optional(),
})

export async function createAgentByAdmin(formData: FormData) {
  const profile = await requireRole(['super_admin', 'agent_manager'])

  const parsed = createAgentSchema.safeParse({
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    isLicensedAgent: formData.get('isLicensedAgent'),
    dealVolume: formData.get('dealVolume') || undefined,
    initialStatus: formData.get('initialStatus'),
    source: formData.get('source') || undefined,
  })

  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }

  const { fullName, email, phone, isLicensedAgent, dealVolume, initialStatus, source } = parsed.data

  const { encrypt: encryptFn, hashPii: hashPiiFn } = await import('@/lib/encryption')
  const [phoneEncrypted, emailEncrypted] = await Promise.all([
    encryptFn(phone),
    encryptFn(email),
  ])

  const now = new Date()
  const [newAgent] = await db.insert(agents).values({
    fullName,
    phoneEncrypted,
    emailEncrypted,
    isLicensedAgent,
    dealVolume,
    applicationStatus: initialStatus,
    source,
    assignedTo: profile.id,
    // Set relevant timestamps based on initial status
    appliedAt: now,
    contactedAt: ['contacted','qualified','approved','active'].includes(initialStatus) ? now : undefined,
    qualifiedAt: ['qualified','approved','active'].includes(initialStatus) ? now : undefined,
    approvedAt: ['approved','active'].includes(initialStatus) ? now : undefined,
    lastActiveAt: initialStatus === 'active' ? now : undefined,
  }).returning({ id: agents.id })

  if (!newAgent) return { ok: false as const, error: 'Failed to create agent' }

  // If created as active or approved, create auth account and link profile
  if (initialStatus === 'active' || initialStatus === 'approved') {
    const supabase = await createClient()
    const { data: inviteData, error: inviteError } =
      await supabase.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_ADMIN_URL}/update-password`,
        data: { full_name: fullName, role: 'agent' },
      })

    if (!inviteError && inviteData.user) {
      await db.insert(profiles).values({
        id: inviteData.user.id,
        fullName,
        role: 'agent',
        status: 'active',
      }).onConflictDoNothing()

      await db.update(agents)
        .set({ profileId: inviteData.user.id })
        .where(eq(agents.id, newAgent.id))
    }
  }

  await writeAudit({
    actorId: profile.id,
    action: 'agent.created_by_admin',
    entity: 'agents',
    entityId: newAgent.id,
    after: { fullName, isLicensedAgent, initialStatus, source },
  })

  revalidatePath('/dashboard/agents')
  return { ok: true as const, agentId: newAgent.id }
}

// ─── Search agents for deal assignment (searches name + decrypted email/phone) ─

export async function searchAgentsForDeal(query: string) {
  await requireRole(['super_admin', 'agent_manager'])

  if (!query || query.trim().length < 2) {
    // Return all active agents if no query
    return db.query.agents.findMany({
      where: eq(agents.applicationStatus, 'active'),
      columns: { id: true, fullName: true, phoneEncrypted: true, emailEncrypted: true, isLicensedAgent: true },
      orderBy: [agents.fullName],
      limit: 20,
    })
  }

  const q = query.trim().toLowerCase()

  // Fetch active agents and filter in JS (since email/phone are encrypted)
  const allActive = await db.query.agents.findMany({
    where: eq(agents.applicationStatus, 'active'),
    columns: { id: true, fullName: true, phoneEncrypted: true, emailEncrypted: true, isLicensedAgent: true },
    orderBy: [agents.fullName],
    limit: 100,
  })

  const { decrypt } = await import('@/lib/encryption')

  const results = await Promise.all(
    allActive.map(async (agent) => {
      // Always match on name
      if (agent.fullName.toLowerCase().includes(q)) return agent

      // Try decrypting email
      if (agent.emailEncrypted) {
        try {
          const email = await decrypt(agent.emailEncrypted)
          if (email.toLowerCase().includes(q)) return agent
        } catch { /* skip */ }
      }

      // Try decrypting phone
      if (agent.phoneEncrypted) {
        try {
          const phone = await decrypt(agent.phoneEncrypted)
          if (phone.replace(/\s/g, '').includes(q.replace(/\s/g, ''))) return agent
        } catch { /* skip */ }
      }

      return null
    })
  )

  return results.filter(Boolean) as typeof allActive
}
