import { redirect } from 'next/navigation'
import { getUser } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'

const ROLE_HOME: Record<string, string> = {
  super_admin: '/dashboard',
  agent_manager: '/dashboard',
  content_manager: '/dashboard/cms',
  auditor: '/dashboard/audit',
  agent: '/portal',
}

export default async function AuthRedirectPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  let role = user.app_metadata?.role as string | undefined

  if (!role) {
    try {
      const sb = createServiceClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (sb as any).from('profiles').select('role').eq('id', user.id).single()
      role = data?.role
      if (role) await sb.auth.admin.updateUserById(user.id, { app_metadata: { role } })
    } catch { /* ignore */ }
  }

  redirect(ROLE_HOME[role ?? ''] ?? '/dashboard')
}
