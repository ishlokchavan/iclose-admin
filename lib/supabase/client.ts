'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/db/database.types'

/**
 * Creates a Supabase client for use in Client Components.
 * Reads the session from cookies (set by the server/proxy).
 *
 * Call this inside a component or hook — not at module level —
 * to ensure it only runs in the browser.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
