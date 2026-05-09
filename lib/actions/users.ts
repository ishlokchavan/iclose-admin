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

  // Create user without triggering Supabase's rate-limited email
  // generateLink creates the user + token; we send our own branded email via Resend
  const { sendAdminInvite } = await import('@/lib/email')

  // First check if user already exists
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (sb().auth.admin as any).listUsers({ perPage: 1000 })
  const existingUser = (existing?.users ?? []).find((u: {email?: string}) => u.email === email)

  let userId: string

  if (existingUser) {
    userId = existingUser.id
  } else {
    // Create user via generateLink (no email sent by Supabase)
    const { data: linkData, error: linkError } = await sb().auth.admin.generateLink({
      type: 'invite',
      email,
      options: { redirectTo: `${process.env.NEXT_PUBLIC_ADMIN_URL}/login`, data: { full_name: fullName } },
    })
    if (linkError || !linkData?.user) return { ok: false as const, error: linkError?.message ?? 'Failed to create user' }
    userId = linkData.user.id
  }

  // Set app_metadata role for JWT-based fast auth
  await sb().auth.admin.updateUserById(userId, {
    app_metadata: { role },
    user_metadata: { full_name: fullName },
  })

  // Create profile
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (sb() as any).from('profiles').upsert({
    id: userId,
    full_name: fullName,
    role,
    status: 'active',
  }, { onConflict: 'id' })

  // Send branded invite email via Resend (no Supabase rate limits)
  const emailResult = await sendAdminInvite({
    recipientEmail: email,
    recipientName: fullName,
    inviterName: actor.fullName,
    role,
  })
  if (!emailResult.ok) console.warn('[users] Invite email failed:', emailResult.error)

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

export async function resendInvite(email: string, recipientName: string, role: string) {
  const actor = await requireRole(['super_admin'])
  const { sendAdminInvite } = await import('@/lib/email')
  const result = await sendAdminInvite({
    recipientEmail: email,
    recipientName,
    inviterName: actor.fullName,
    role,
  })
  if (!result.ok) return { ok: false as const, error: result.error }
  return { ok: true as const }
}
