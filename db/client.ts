import 'server-only'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set.')
}

/**
 * Serverless-safe Drizzle client.
 * - prepare: false  — required for Supabase Transaction Pooler (PgBouncer)
 * - max: 1          — serverless functions should use 1 connection per invocation
 */
const pgClient = postgres(process.env.DATABASE_URL, {
  prepare: false,
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
})

export const db = drizzle(pgClient, { schema })
export type DB = typeof db
