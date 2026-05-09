import { createClient } from '@/lib/supabase/server'
import { db } from '@/db/client'
import { profiles } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import type { Role } from '@/db/schema'

// ─── Session ──────────────────────────────────────────────────────────────────

/**
 * Returns the current Supabase session, or null if unauthenticated.
 * Safe to call from Server Components and Server Actions.
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
 * This is the source of truth for role — never use JWT claims for authz.
 * Returns null if not authenticated or profile not found.
 */
export async function getProfile() {
  const session = await getSession()
  if (!session) return null

  try {
    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, session.user.id),
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
 *
 * @example
 * const profile = await requireRole(['super_admin', 'agent_manager'])
 */
export async function requireRole(
  allowedRoles: Role[],
  options: { redirectTo?: string } = {}
) {
  const session = await getSession()

  if (!session) {
    redirect(options.redirectTo ?? '/login')
  }

  const profile = await getProfile()

  if (!profile) {
    // Authenticated but no profile row — likely a new user pending setup
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
 * Agent must be role=agent and status=active.
 */
export async function requireAgent(options: { redirectTo?: string } = {}) {
  return requireRole(['agent'], options)
}

/**
 * Returns the current profile without redirecting.
 * Use this when you want to conditionally render based on role
 * without hard-gating the route.
 */
export async function getProfileOrNull() {
  try {
    return await getProfile()
  } catch {
    return null
  }
}
