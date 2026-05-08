import type { Config } from 'drizzle-kit'

export default {
  schema: './db/schema.ts',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    // Use DIRECT_URL (non-pooled) for migrations — required by Drizzle Kit
    url: process.env.DIRECT_URL!,
  },
  // Introspect Supabase's auth schema too (read-only reference)
  schemaFilter: ['public'],
  verbose: true,
  strict: true,
} satisfies Config
