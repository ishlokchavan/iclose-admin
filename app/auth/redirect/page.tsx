import { redirect } from 'next/navigation'
import { getUser } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'

export default async function AuthRedirectPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  // Try JWT first
  let role = user.app_metadata?.role as string | undefined

  // Fall back to DB if JWT has no role
  if (!role) {
    try {
      const sb = createServiceClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (sb as any).from('profiles').select('role').eq('id', user.id).single()
      role = data?.role
      // Backfill app_metadata
      if (role) await sb.auth.admin.updateUserById(user.id, { app_metadata: { role } })
    } catch { /* ignore */ }
  }

  if (role === 'agent') redirect('/portal')
  if (role === 'content_manager') redirect('/dashboard/cms')
  if (role === 'auditor') redirect('/dashboard/audit')
  if (role && ['super_admin','agent_manager'].includes(role)) redirect('/dashboard')

  // No profile yet — redirect to dashboard as fallback
  redirect('/dashboard')
}
