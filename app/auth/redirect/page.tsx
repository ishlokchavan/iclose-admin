import { redirect } from 'next/navigation'
import { getUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

/**
 * Role-aware redirect after login.
 * Uses Supabase JS (HTTPS) — works on Vercel serverless.
 */
export default async function AuthRedirectPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if ((data as {role: string} | null)?.role === 'agent') redirect('/portal')
  } catch (err) {
    console.error('[auth/redirect] error:', err)
  }

  redirect('/dashboard')
}
