import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import type { Role, Profile } from '@/db/schema'

/**
 * React cache() deduplicates calls within a single server render pass.
 * getUser() and getProfile() are called multiple times per page
 * (layout + page + components) — cache ensures only 1 network call each.
 */

export const getUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
})

export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser()
  if (!user) return null

  try {
    const { createServiceClient } = await import('@/lib/supabase/service')
    const sb = createServiceClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (sb as any)
      .from('profiles')
      .select('id, full_name, phone, role, status, avatar_url, created_at, updated_at')
      .eq('id', user.id)
      .single()

    if (error || !data) {
      console.error('[auth] getProfile error:', error?.message)
      return null
    }

    const row = data as Record<string, unknown>
    return {
      id: row.id,
      fullName: row.full_name,
      phone: row.phone,
      role: row.role,
      status: row.status,
      avatarUrl: row.avatar_url,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    } as Profile
  } catch (err) {
    console.error('[auth] getProfile error:', err)
    return null
  }
})

export async function getSession() {
  const supabase = await createClient()
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error) return null
  return session
}

export async function requireRole(
  allowedRoles: Role[],
  options: { redirectTo?: string } = {}
): Promise<Profile> {
  const user = await getUser()
  if (!user) redirect(options.redirectTo ?? '/login')

  const profile = await getProfile()
  if (!profile) redirect('/login?error=no_profile')

  if (!allowedRoles.includes(profile.role)) {
    if (profile.role === 'agent') redirect('/portal')
    redirect('/unauthorized')
  }

  if (profile.status !== 'active') redirect('/login?error=account_suspended')

  return profile
}

export async function requireAgent(options: { redirectTo?: string } = {}) {
  return requireRole(['agent'], options)
}

export async function getProfileOrNull() {
  try { return await getProfile() } catch { return null }
}
