import { redirect } from 'next/navigation'
import { getUser } from '@/lib/auth'

export default async function AuthRedirectPage() {
  const user = await getUser()
  if (!user) redirect('/login')
  // Role from JWT app_metadata — no DB call
  const role = user.app_metadata?.role ?? 'agent'
  if (role === 'agent') redirect('/portal')
  redirect('/dashboard')
}
