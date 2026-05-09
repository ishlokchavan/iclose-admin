'use client'

import type { Role } from '@/db/schema'

interface RoleGateProps {
  profile: { role: Role } | null
  allowedRoles: Role[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

/**
 * Client component that conditionally renders children based on role.
 * Use for UI-level gating (hiding buttons, sections).
 * Always pair with server-side requireRole() for actual security.
 *
 * @example
 * <RoleGate profile={profile} allowedRoles={['super_admin']}>
 *   <DeleteButton />
 * </RoleGate>
 */
export default function RoleGate({
  profile,
  allowedRoles,
  children,
  fallback = null,
}: RoleGateProps) {
  if (!profile || !allowedRoles.includes(profile.role)) {
    return <>{fallback}</>
  }
  return <>{children}</>
}
