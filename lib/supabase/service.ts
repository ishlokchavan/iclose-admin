import 'server-only'
import { createClient } from '@supabase/supabase-js'

/**
 * Supabase service role client — bypasses RLS, used for server-side mutations.
 * Uses HTTPS (not raw TCP) so works on Vercel serverless.
 * NEVER expose this to the browser.
 */
export function createServiceClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) throw new Error('NEXT_PUBLIC_SUPABASE_URL not set')
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY not set')

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
