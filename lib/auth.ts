import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

/**
 * Returns the current session and user, or null if unauthenticated.
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

/**
 * Returns the current user's profile row including their role.
 * Returns null if not authenticated.
 *
 * NOTE: Full implementation in Phase 1 once `profiles` table exists.
 * This stub returns null and is safe to import.
 */
export async function getProfile() {
  const session = await getSession()
  if (!session) return null

  // Phase 1: query profiles table via Drizzle
  // const profile = await db.query.profiles.findFirst({
  //   where: eq(profiles.id, session.user.id),
  // })
  // return profile

  return null
}

/**
 * Asserts that the current user has one of the required roles.
 * Redirects to /login if unauthenticated, throws if unauthorized.
 *
 * NOTE: Full implementation in Phase 1. Currently only checks authentication.
 *
 * @example
 * await requireRole(['super_admin', 'agent_manager'])
 */
export async function requireRole(
  _allowedRoles: string[],
  options: { redirectTo?: string } = {}
) {
  const session = await getSession()

  if (!session) {
    redirect(options.redirectTo ?? '/login')
  }

  // Phase 1: check profile.role against allowedRoles
  // const profile = await getProfile()
  // if (!profile || !allowedRoles.includes(profile.role)) {
  //   throw new Error('Forbidden')
  // }

  return session
}

/**
 * Asserts agent authentication for portal routes.
 * Redirects to /login if unauthenticated.
 */
export async function requireAgent(options: { redirectTo?: string } = {}) {
  return requireRole(['agent'], options)
}
