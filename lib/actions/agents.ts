'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { requireRole } from '@/lib/auth'
import { writeAudit } from '@/lib/audit'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { headers } from 'next/headers'
import { VALID_STATUS_TRANSITIONS, type ApplicationStatus, type Role } from '@/db/schema'

// ─── List agents ──────────────────────────────────────────────────────────────

export async function getAgents(filters: {
  status?: ApplicationStatus; search?: string; page?: number; pageSize?: number
} = {}) {
  await requireRole(['super_admin', 'agent_manager', 'auditor', 'content_manager'])
  const sb = createServiceClient()
  const { status, search, page = 1, pageSize = 20 } = filters
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (sb as any).from('agents').select(
    'id, full_name, application_status, is_licensed_agent, deal_volume, source, applied_at, approved_at, assigned_to, kyc_status, total_commission_earned',
    { count: 'exact' }
  )

  if (status) q = q.eq('application_status', status)
  if (search) q = q.ilike('full_name', `%${search}%`)

  const { data, count } = await q.order('applied_at', { ascending: false }).range(from, to)
  const total = count ?? 0
  return { agents: data ?? [], total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}

// ─── Get single agent ─────────────────────────────────────────────────────────

export async function getAgent(id: string) {
  await requireRole(['super_admin', 'agent_manager', 'auditor', 'content_manager'])
  const sb = createServiceClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (sb as any).from('agents').select(`
    *, 
    notes:agent_notes(*, author:profiles!agent_notes_author_id_fkey(id, full_name, role)),
    statusHistory:agent_status_history(*, changedBy:profiles!agent_status_history_changed_by_fkey(id, full_name)),
    assignedTo:profiles!agents_assigned_to_fkey(id, full_name, role)
  `).eq('id', id).single()

  return data ?? null
}

// ─── Update agent status ──────────────────────────────────────────────────────

const updateStatusSchema = z.object({
  agentId: z.string().uuid(),
  newStatus: z.enum(['applied','contacted','qualified','approved','active','rejected','inactive']),
  reason: z.string().max(500).optional(),
})

export async function updateAgentStatus(formData: FormData) {
  const profile = await requireRole(['super_admin', 'agent_manager'])
  const parsed = updateStatusSchema.safeParse({
    agentId: formData.get('agentId'),
    newStatus: formData.get('newStatus'),
    reason: formData.get('reason') || undefined,
  })
  if (!parsed.success) return { ok: false as const, error: 'Invalid input' }

  const { agentId, newStatus, reason } = parsed.data
  const sb = createServiceClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: agent } = await (sb as any).from('agents')
    .select('id, application_status, full_name, email_encrypted')
    .eq('id', agentId).single()

  if (!agent) return { ok: false as const, error: 'Agent not found' }

  const now = new Date().toISOString()
  const timestampUpdates: Record<string, string> = {}
  if (newStatus === 'contacted') timestampUpdates.contacted_at = now
  if (newStatus === 'qualified') timestampUpdates.qualified_at = now
  if (['approved','active'].includes(newStatus)) timestampUpdates.approved_at = now
  if (newStatus === 'active') timestampUpdates.last_active_at = now
  if (newStatus === 'rejected') timestampUpdates.rejected_at = now

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (sb as any).from('agents').update({
    application_status: newStatus, updated_at: now, ...timestampUpdates
  }).eq('id', agentId)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (sb as any).from('agent_status_history').insert({
    agent_id: agentId, from_status: agent.application_status,
    to_status: newStatus, changed_by: profile.id, reason: reason ?? null,
  })

  const headersList = await headers()
  await writeAudit({
    actorId: profile.id, action: 'agent.status_change', entity: 'agents', entityId: agentId,
    before: { application_status: agent.application_status },
    after: { application_status: newStatus, reason },
    ip: headersList.get('x-forwarded-for')?.split(',')[0] ?? undefined,
  })

  if (newStatus === 'approved') await approveAgentAuth(agentId, profile.id)

  revalidatePath('/dashboard/agents')
  revalidatePath(`/dashboard/agents/${agentId}`)
  return { ok: true as const }
}

// ─── Approve agent — send auth invite ────────────────────────────────────────

async function approveAgentAuth(agentId: string, actorId: string) {
  const sb = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: agent } = await (sb as any).from('agents')
    .select('id, full_name, email_encrypted, profile_id').eq('id', agentId).single()

  if (!agent || !agent.email_encrypted || agent.profile_id) return

  const { decrypt } = await import('@/lib/encryption')
  let email: string
  try { email = await decrypt(agent.email_encrypted) } catch { return }

  const { data: inviteData, error: inviteError } =
    await sb.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_ADMIN_URL}/login`,
      data: { full_name: agent.full_name, role: 'agent' },
    })

  if (inviteError || !inviteData.user) return

  const userId = inviteData.user.id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (sb as any).from('profiles').upsert({ id: userId, full_name: agent.full_name, role: 'agent', status: 'active' })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (sb as any).from('agents').update({ profile_id: userId }).eq('id', agentId)

  await writeAudit({ actorId, action: 'agent.approved_invite_sent', entity: 'agents', entityId: agentId })
}

// ─── Assign agent ─────────────────────────────────────────────────────────────

export async function assignAgent(agentId: string, assignToProfileId: string | null) {
  const profile = await requireRole(['super_admin', 'agent_manager'])
  const sb = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (sb as any).from('agents').update({ assigned_to: assignToProfileId, updated_at: new Date().toISOString() }).eq('id', agentId)
  await writeAudit({ actorId: profile.id, action: 'agent.assigned', entity: 'agents', entityId: agentId, after: { assigned_to: assignToProfileId } })
  revalidatePath(`/dashboard/agents/${agentId}`)
  return { ok: true as const }
}

// ─── Add note ─────────────────────────────────────────────────────────────────

export async function addAgentNote(formData: FormData) {
  const profile = await requireRole(['super_admin', 'agent_manager'])
  const agentId = formData.get('agentId') as string
  const body = formData.get('body') as string
  if (!agentId || !body) return { ok: false as const, error: 'Invalid input' }

  const sb = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (sb as any).from('agent_notes').insert({ agent_id: agentId, author_id: profile.id, body })
  revalidatePath(`/dashboard/agents/${agentId}`)
  return { ok: true as const }
}

// ─── Get agent managers ───────────────────────────────────────────────────────

export async function getAgentManagers() {
  await requireRole(['super_admin', 'agent_manager'])
  const sb = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (sb as any).from('profiles')
    .select('id, full_name, role')
    .in('role', ['super_admin', 'agent_manager'])
    .eq('status', 'active')
    .order('full_name')
  return data ?? []
}

// ─── Search agents ────────────────────────────────────────────────────────────

export async function searchAgentsForDeal(query: string) {
  await requireRole(['super_admin', 'agent_manager'])
  const sb = createServiceClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (sb as any).from('agents')
    .select('id, full_name, is_licensed_agent, phone_encrypted, email_encrypted')
    .eq('application_status', 'active')
    .order('full_name')
    .limit(50)

  if (query && query.trim().length >= 2) {
    q = q.ilike('full_name', `%${query.trim()}%`)
  }

  const { data } = await q
  if (!query || query.trim().length < 2) return data ?? []

  // Also search encrypted fields in JS
  const { decrypt } = await import('@/lib/encryption')
  const q2 = query.trim().toLowerCase()
  const all = data ?? []
  const matched = await Promise.all(all.map(async (a: Record<string, unknown>) => {
    if ((a.full_name as string).toLowerCase().includes(q2)) return a
    for (const field of ['email_encrypted', 'phone_encrypted']) {
      if (a[field]) {
        try { if ((await decrypt(a[field] as string)).toLowerCase().includes(q2)) return a } catch {}
      }
    }
    return null
  }))
  return matched.filter(Boolean)
}

// ─── Create agent by admin ────────────────────────────────────────────────────

const createAgentSchema = z.object({
  fullName: z.string().min(2).max(128),
  email: z.string().email(),
  phone: z.string().min(7).max(32),
  isLicensedAgent: z.enum(['true','false']).transform(v => v === 'true'),
  dealVolume: z.enum(['0-1','1-3','3-5','5-10','10+']).optional(),
  initialStatus: z.enum(['applied','contacted','qualified','approved','active']).default('applied'),
  source: z.string().max(128).optional(),
  plan: z.enum(['plus','pro','pro_max','ultra']).default('plus'),
})

export async function createAgentByAdmin(formData: FormData) {
  const profile = await requireRole(['super_admin', 'agent_manager'])
  const parsed = createAgentSchema.safeParse({
    fullName: formData.get('fullName'), email: formData.get('email'),
    phone: formData.get('phone'), isLicensedAgent: formData.get('isLicensedAgent'),
    dealVolume: formData.get('dealVolume') || undefined,
    initialStatus: formData.get('initialStatus'), source: formData.get('source') || undefined,
    plan: formData.get('plan') || undefined,
  })
  if (!parsed.success) return { ok: false as const, error: parsed.error.errors[0]?.message ?? 'Invalid input' }

  const { fullName, email, phone, isLicensedAgent, dealVolume, initialStatus, source, plan } = parsed.data
  const { encrypt, hashPii } = await import('@/lib/encryption')
  const [phoneEncrypted, emailEncrypted] = await Promise.all([encrypt(phone), encrypt(email)])

  const now = new Date().toISOString()
  const timestamps: Record<string, string> = { applied_at: now }
  if (['contacted','qualified','approved','active'].includes(initialStatus)) timestamps.contacted_at = now
  if (['qualified','approved','active'].includes(initialStatus)) timestamps.qualified_at = now
  if (['approved','active'].includes(initialStatus)) timestamps.approved_at = now
  if (initialStatus === 'active') timestamps.last_active_at = now

  const sb = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: newAgent, error } = await (sb as any).from('agents').insert({
    full_name: fullName, phone_encrypted: phoneEncrypted, email_encrypted: emailEncrypted,
    is_licensed_agent: isLicensedAgent, deal_volume: dealVolume,
    application_status: initialStatus, source, plan, assigned_to: profile.id, ...timestamps,
  }).select('id').single()

  if (error || !newAgent) return { ok: false as const, error: 'Failed to create agent' }

  if (['active','approved'].includes(initialStatus)) {
    const { data: inviteData } = await sb.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_ADMIN_URL}/login`,
      data: { full_name: fullName, role: 'agent' },
    })
    if (inviteData?.user) {
      const userId = inviteData.user.id
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (sb as any).from('profiles').upsert({ id: userId, full_name: fullName, role: 'agent', status: 'active' })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (sb as any).from('agents').update({ profile_id: userId }).eq('id', newAgent.id)
    }
  }

  await writeAudit({ actorId: profile.id, action: 'agent.created_by_admin', entity: 'agents', entityId: newAgent.id, after: { fullName, isLicensedAgent, initialStatus, source } })
  revalidatePath('/dashboard/agents')
  return { ok: true as const, agentId: newAgent.id }
}
