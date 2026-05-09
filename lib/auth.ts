import { createClient } from '@/lib/supabase/server'
import { db } from '@/db/client'
import { profiles } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import type { Role } from '@/db/schema'

// ─── User ─────────────────────────────────────────────────────────────────────

/**
 * Returns the authenticated user from Supabase Auth server.
 * Uses getUser() — contacts the Auth server to verify the JWT.
 * More secure than getSession() which only reads from cookies.
 */
export async function getUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) return null
  return user
}

/**
 * @deprecated Use getUser() instead.
 * Kept for any callers that need the full session object (e.g. refresh token).
 */
export async function getSession() {
  const supabase = await createClient()
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error) {
    console.error('[auth] getSession error:', error.message)
    return null
  }

  return session
}

// ─── Profile ──────────────────────────────────────────────────────────────────

/**
 * Returns the current user's profile row from the `profiles` table.
 * Role is read from the DB — never from JWT claims.
 */
export async function getProfile() {
  const user = await getUser()
  if (!user) return null

  try {
    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, user.id),
    })
    return profile ?? null
  } catch (err) {
    console.error('[auth] getProfile error:', err)
    return null
  }
}

// ─── Role enforcement ─────────────────────────────────────────────────────────

/**
 * Asserts that the current user is authenticated AND has one of the
 * required roles. Reads from `profiles` table — never trusts JWT claims.
 *
 * - Redirects to /login if not authenticated
 * - Redirects to /unauthorized if authenticated but wrong role
 */
export async function requireRole(
  allowedRoles: Role[],
  options: { redirectTo?: string } = {}
) {
  const user = await getUser()

  if (!user) {
    redirect(options.redirectTo ?? '/login')
  }

  const profile = await getProfile()

  if (!profile) {
    redirect('/login')
  }

  if (!allowedRoles.includes(profile.role)) {
    redirect('/unauthorized')
  }

  if (profile.status !== 'active') {
    redirect('/login?error=account_suspended')
  }

  return profile
}

/**
 * Asserts agent authentication for portal routes.
 */
export async function requireAgent(options: { redirectTo?: string } = {}) {
  return requireRole(['agent'], options)
}

/**
 * Returns the current profile without redirecting.
 */
export async function getProfileOrNull() {
  try {
    return await getProfile()
  } catch {
    return null
  }
}
