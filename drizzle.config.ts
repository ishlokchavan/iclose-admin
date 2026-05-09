import type { Config } from 'drizzle-kit'
import * as dotenv from 'dotenv'

// drizzle-kit does not load .env.local automatically — load it explicitly
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

if (!process.env.DIRECT_URL) {
  throw new Error('DIRECT_URL is not set in .env.local')
}

export default {
  schema: './db/schema.ts',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DIRECT_URL,
  },
  schemaFilter: ['public'],
  verbose: true,
  strict: true,
} satisfies Config
