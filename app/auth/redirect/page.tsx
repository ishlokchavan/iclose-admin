import { redirect } from 'next/navigation'
import { getUser } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'

export default async function AuthRedirectPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  try {
    const sb = createServiceClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (sb as any).from('profiles').select('role').eq('id', user.id).single()
    if (data?.role === 'agent') redirect('/portal')
  } catch (err) {
    console.error('[auth/redirect]', err)
  }

  redirect('/dashboard')
}
