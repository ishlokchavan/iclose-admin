import 'server-only'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

/**
 * Server-only Drizzle client.
 * The `server-only` import ensures this module never reaches the browser bundle.
 *
 * Uses a pooled connection string (DATABASE_URL) suitable for serverless/edge.
 * For migrations, use DIRECT_URL via drizzle.config.ts.
 */

// Prevent multiple connections in development hot-reload
const globalForDb = global as unknown as {
  _pgClient: ReturnType<typeof postgres> | undefined
}

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is not set. Check your .env.local file.')
}

const pgClient =
  globalForDb._pgClient ??
  postgres(connectionString, {
    // Supabase Transaction Pooler requires prepare: false
    prepare: false,
  })

if (process.env.NODE_ENV !== 'production') {
  globalForDb._pgClient = pgClient
}

export const db = drizzle(pgClient, { schema })
export type DB = typeof db
