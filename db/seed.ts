/**
 * Seed script — creates the first super_admin user.
 *
 * Usage:
 *   npx tsx db/seed.ts
 *
 * Set these in your .env.local before running:
 *   SEED_ADMIN_EMAIL=you@iclose.ae
 *   SEED_ADMIN_PASSWORD=YourStrongPassword123!
 *   SEED_ADMIN_NAME="Your Name"
 */

import { createClient } from '@supabase/supabase-js'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { profiles } from './schema'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DIRECT_URL',
  'SEED_ADMIN_EMAIL',
  'SEED_ADMIN_PASSWORD',
  'SEED_ADMIN_NAME',
]

for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required env var: ${key}`)
    process.exit(1)
  }
}

async function seed() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const email = process.env.SEED_ADMIN_EMAIL!
  const password = process.env.SEED_ADMIN_PASSWORD!
  const fullName = process.env.SEED_ADMIN_NAME!

  console.log(`Creating super_admin: ${email}`)

  // 1. Create auth user via service role (bypasses email confirmation)
  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

  if (authError) {
    if (authError.message.includes('already been registered')) {
      console.log('User already exists in auth — skipping auth creation.')
      const { data: existingUser } = await supabase.auth.admin.listUsers()
      const user = existingUser.users.find((u) => u.email === email)
      if (!user) { console.error('Could not find existing user'); process.exit(1) }

      await upsertProfile(user.id, fullName)
    } else {
      console.error('Auth error:', authError.message)
      process.exit(1)
    }
    return
  }

  const userId = authData.user.id
  console.log(`Auth user created: ${userId}`)

  // 2. Insert profile row
  await upsertProfile(userId, fullName)

  console.log('✅ super_admin seeded successfully.')
  console.log(`   Email:    ${email}`)
  console.log(`   Password: ${password}`)
  console.log(`   Role:     super_admin`)
  console.log('')
  console.log('Next: visit /mfa/enroll to set up 2FA for this account.')
}

async function upsertProfile(id: string, fullName: string) {
  const sql = postgres(process.env.DIRECT_URL!, { prepare: false })
  const db = drizzle(sql)

  await db
    .insert(profiles)
    .values({ id, fullName, role: 'super_admin', status: 'active' })
    .onConflictDoUpdate({
      target: profiles.id,
      set: { role: 'super_admin', fullName, status: 'active' },
    })

  console.log(`Profile upserted: ${id} → super_admin`)
  await sql.end()
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
