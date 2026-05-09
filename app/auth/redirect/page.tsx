import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/auth'

/**
 * Role-aware redirect after login.
 * Agents → /portal, everyone else → /dashboard
 */
export default async function AuthRedirectPage() {
  const profile = await getProfile()

  if (!profile) redirect('/login')
  if (profile.role === 'agent') redirect('/portal')
  redirect('/dashboard')
}
