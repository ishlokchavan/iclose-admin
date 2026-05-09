import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ─── Enums ────────────────────────────────────────────────────────────────────

export const roleEnum = pgEnum('role', [
  'super_admin',
  'content_manager',
  'agent_manager',
  'agent',
  'auditor',
])

export const profileStatusEnum = pgEnum('profile_status', [
  'active',
  'inactive',
  'suspended',
])

// ─── Profiles ─────────────────────────────────────────────────────────────────

/**
 * 1:1 with auth.users. Created on first sign-in or when admin invites a user.
 * The `role` column here is the source of truth — never trust JWT claims.
 */
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(), // matches auth.users.id
  fullName: text('full_name').notNull(),
  phone: varchar('phone', { length: 32 }),
  role: roleEnum('role').notNull().default('agent'),
  status: profileStatusEnum('status').notNull().default('active'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ─── Relations ────────────────────────────────────────────────────────────────

export const profilesRelations = relations(profiles, ({ many }) => ({
  // Phase 2: agents assigned to this profile
  // assignedAgents: many(agents),
}))

// ─── Types ────────────────────────────────────────────────────────────────────

export type Profile = typeof profiles.$inferSelect
export type NewProfile = typeof profiles.$inferInsert
export type Role = (typeof roleEnum.enumValues)[number]
export type ProfileStatus = (typeof profileStatusEnum.enumValues)[number]

export const ADMIN_ROLES: Role[] = [
  'super_admin',
  'content_manager',
  'agent_manager',
  'auditor',
]

export const WRITE_ROLES: Role[] = [
  'super_admin',
  'content_manager',
  'agent_manager',
]
