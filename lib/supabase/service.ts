import 'server-only'
import { createClient } from '@supabase/supabase-js'

let _client: ReturnType<typeof createClient> | null = null

/**
 * Singleton service role client — reused across requests in the same serverless instance.
 * Uses HTTPS (not raw TCP) — works on Vercel serverless.
 */
export function createServiceClient() {
  if (_client) return _client

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) throw new Error('NEXT_PUBLIC_SUPABASE_URL not set')
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY not set')

  _client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      global: {
        fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' })
      }
    }
  )
  return _client
}
