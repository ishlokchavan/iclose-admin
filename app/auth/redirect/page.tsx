import { redirect } from 'next/navigation'
import { getUser } from '@/lib/auth'

/**
 * Role-aware redirect after login.
 * Reads role from DB — falls back to /dashboard if DB unavailable.
 */
export default async function AuthRedirectPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  try {
    const { db } = await import('@/db/client')
    const { profiles } = await import('@/db/schema')
    const { eq } = await import('drizzle-orm')

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, user.id),
      columns: { role: true },
    })

    if (profile?.role === 'agent') redirect('/portal')
  } catch (err) {
    console.error('[auth/redirect] DB error, falling back to /dashboard:', err)
  }

  redirect('/dashboard')
}
