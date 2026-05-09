'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { requireRole } from '@/lib/auth'
import { writeAudit } from '@/lib/audit'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const sb = () => createServiceClient()

// ─── List admin users ─────────────────────────────────────────────────────────

export async function getAdminUsers() {
  await requireRole(['super_admin'])

  // Get all profiles that are NOT agents
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profiles } = await (sb() as any)
    .from('profiles')
    .select('id, full_name, role, status, created_at, updated_at')
    .neq('role', 'agent')
    .order('created_at', { ascending: false })

  // Get auth emails via admin API
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: authData } = await (sb().auth.admin as any).listUsers({ perPage: 1000 })
  const users: {id: string; email?: string; last_sign_in_at?: string}[] = authData?.users ?? []

  const emailMap = new Map(users.map((u: {id: string; email?: string}) => [u.id, u.email ?? '']))

  return (profiles ?? []).map((p: Record<string, unknown>) => ({
    ...p,
    email: emailMap.get(p.id as string) ?? '',
    lastSignIn: users.find(u => u.id === p.id)?.last_sign_in_at ?? null,
  }))
}

// ─── Invite admin user ────────────────────────────────────────────────────────

const inviteSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2).max(128),
  role: z.enum(['super_admin', 'content_manager', 'agent_manager', 'auditor']),
})

export async function inviteAdminUser(formData: FormData) {
  const actor = await requireRole(['super_admin'])

  const parsed = inviteSchema.safeParse({
    email: formData.get('email'),
    fullName: formData.get('fullName'),
    role: formData.get('role'),
  })
  if (!parsed.success) return { ok: false as const, error: parsed.error.errors[0]?.message ?? 'Invalid input' }

  const { email, fullName, role } = parsed.data

  // Invite via Supabase Auth
  const { data, error } = await sb().auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_ADMIN_URL}/login`,
    data: { full_name: fullName },
  })

  if (error || !data.user) return { ok: false as const, error: error?.message ?? 'Failed to send invite' }

  const userId = data.user.id

  // Set app_metadata role for JWT-based fast auth
  await sb().auth.admin.updateUserById(userId, {
    app_metadata: { role },
  })

  // Create profile
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (sb() as any).from('profiles').upsert({
    id: userId,
    full_name: fullName,
    role,
    status: 'active',
  }, { onConflict: 'id' })

  await writeAudit({
    actorId: actor.id,
    action: 'user.invited',
    entity: 'profiles',
    entityId: userId,
    after: { email, fullName, role },
  })

  revalidatePath('/dashboard/users')
  return { ok: true as const }
}

// ─── Update user role ─────────────────────────────────────────────────────────

export async function updateUserRole(userId: string, newRole: string) {
  const actor = await requireRole(['super_admin'])
  if (userId === actor.id) return { ok: false as const, error: "You can't change your own role" }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (sb() as any).from('profiles').select('role').eq('id', userId).single()

  // Update profile
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (sb() as any).from('profiles').update({ role: newRole, updated_at: new Date().toISOString() }).eq('id', userId)

  // Update JWT app_metadata
  await sb().auth.admin.updateUserById(userId, { app_metadata: { role: newRole } })

  await writeAudit({
    actorId: actor.id,
    action: 'user.role_changed',
    entity: 'profiles',
    entityId: userId,
    before: { role: profile?.role },
    after: { role: newRole },
  })

  revalidatePath('/dashboard/users')
  return { ok: true as const }
}

// ─── Suspend / reactivate user ────────────────────────────────────────────────

export async function updateUserStatus(userId: string, newStatus: 'active' | 'suspended') {
  const actor = await requireRole(['super_admin'])
  if (userId === actor.id) return { ok: false as const, error: "You can't suspend yourself" }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (sb() as any).from('profiles').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', userId)

  if (newStatus === 'suspended') {
    await sb().auth.admin.updateUserById(userId, { ban_duration: '87600h' }) // 10 years
  } else {
    await sb().auth.admin.updateUserById(userId, { ban_duration: 'none' })
  }

  await writeAudit({
    actorId: actor.id,
    action: `user.${newStatus}`,
    entity: 'profiles',
    entityId: userId,
    after: { status: newStatus },
  })

  revalidatePath('/dashboard/users')
  return { ok: true as const }
}

// ─── Delete user ──────────────────────────────────────────────────────────────

export async function deleteAdminUser(userId: string) {
  const actor = await requireRole(['super_admin'])
  if (userId === actor.id) return { ok: false as const, error: "You can't delete yourself" }

  await sb().auth.admin.deleteUser(userId)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (sb() as any).from('profiles').delete().eq('id', userId)

  await writeAudit({
    actorId: actor.id,
    action: 'user.deleted',
    entity: 'profiles',
    entityId: userId,
  })

  revalidatePath('/dashboard/users')
  return { ok: true as const }
}

// ─── Resend invite ────────────────────────────────────────────────────────────

export async function resendInvite(email: string) {
  await requireRole(['super_admin'])
  const { error } = await sb().auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_ADMIN_URL}/login`,
  })
  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const }
}
