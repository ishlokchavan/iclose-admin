import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  timestamp,
  varchar,
  integer,
  decimal,
  jsonb,
  index,
  uniqueIndex,
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

export const applicationStatusEnum = pgEnum('application_status', [
  'applied',
  'contacted',
  'qualified',
  'approved',
  'active',
  'rejected',
  'inactive',
])

export const dealStatusEnum = pgEnum('deal_status', [
  'pending',
  'signed',
  'paid',
  'cancelled',
])

export const advanceStatusEnum = pgEnum('advance_status', [
  'requested',
  'approved',
  'disbursed',
  'rejected',
])

export const kycStatusEnum = pgEnum('kyc_status', [
  'not_started',
  'pending',
  'verified',
  'rejected',
])

export const dealVolumeEnum = pgEnum('deal_volume', [
  '0-1',
  '1-3',
  '3-5',
  '5-10',
  '10+',
])

// ─── Profiles ─────────────────────────────────────────────────────────────────

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),
  fullName: text('full_name').notNull(),
  phone: varchar('phone', { length: 32 }),
  role: roleEnum('role').notNull().default('agent'),
  status: profileStatusEnum('status').notNull().default('active'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ─── Agents ───────────────────────────────────────────────────────────────────

export const agents = pgTable('agents', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Linked to auth.users once approved — null until then
  profileId: uuid('profile_id').references(() => profiles.id, { onDelete: 'set null' }),

  // Core identity (PII stored encrypted in separate columns)
  fullName: text('full_name').notNull(),
  phoneEncrypted: text('phone_encrypted'),
  emailEncrypted: text('email_encrypted'),

  // Public-facing anonymous identifier (shared with buyer, never the real ID)
  anonymousId: uuid('anonymous_id').notNull().defaultRandom(),

  // Agent type — false = connector/referrer sub-type
  isLicensedAgent: boolean('is_licensed_agent').notNull().default(true),

  // Self-reported deal volume at registration
  dealVolume: dealVolumeEnum('deal_volume'),

  // Lifecycle status — the single source of truth
  applicationStatus: applicationStatusEnum('application_status')
    .notNull()
    .default('applied'),

  // Attribution
  source: varchar('source', { length: 128 }),
  utmSource: varchar('utm_source', { length: 128 }),
  utmMedium: varchar('utm_medium', { length: 128 }),
  utmCampaign: varchar('utm_campaign', { length: 128 }),
  utmContent: varchar('utm_content', { length: 128 }),
  utmTerm: varchar('utm_term', { length: 128 }),

  // Privacy — IP hashed server-side, never raw
  ipHash: varchar('ip_hash', { length: 64 }),
  userAgent: text('user_agent'),

  // KYC
  kycStatus: kycStatusEnum('kyc_status').notNull().default('not_started'),
  kycDocumentsEncrypted: text('kyc_documents_encrypted'),

  // Payout
  payoutDetailsEncrypted: text('payout_details_encrypted'),

  // Assignment
  assignedTo: uuid('assigned_to').references(() => profiles.id, { onDelete: 'set null' }),

  // Internal notes (quick text — full notes in agent_notes table)
  notes: text('notes'),

  // Timestamps
  appliedAt: timestamp('applied_at', { withTimezone: true }).notNull().defaultNow(),
  contactedAt: timestamp('contacted_at', { withTimezone: true }),
  qualifiedAt: timestamp('qualified_at', { withTimezone: true }),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  rejectedAt: timestamp('rejected_at', { withTimezone: true }),
  lastActiveAt: timestamp('last_active_at', { withTimezone: true }),

  // Financials (denormalized for fast KPI queries)
  totalCommissionEarned: decimal('total_commission_earned', { precision: 12, scale: 2 })
    .notNull()
    .default('0'),
  totalCommissionPaid: decimal('total_commission_paid', { precision: 12, scale: 2 })
    .notNull()
    .default('0'),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  anonymousIdIdx: uniqueIndex('agents_anonymous_id_idx').on(t.anonymousId),
  statusIdx: index('agents_status_idx').on(t.applicationStatus),
  assignedToIdx: index('agents_assigned_to_idx').on(t.assignedTo),
  appliedAtIdx: index('agents_applied_at_idx').on(t.appliedAt),
}))

// ─── Agent Notes ──────────────────────────────────────────────────────────────

export const agentNotes = pgTable('agent_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id').notNull().references(() => profiles.id, { onDelete: 'restrict' }),
  body: text('body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  agentIdx: index('agent_notes_agent_id_idx').on(t.agentId),
}))

// ─── Agent Status History ─────────────────────────────────────────────────────

export const agentStatusHistory = pgTable('agent_status_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
  fromStatus: applicationStatusEnum('from_status'),
  toStatus: applicationStatusEnum('to_status').notNull(),
  changedBy: uuid('changed_by').references(() => profiles.id, { onDelete: 'set null' }),
  reason: text('reason'),
  changedAt: timestamp('changed_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  agentIdx: index('status_history_agent_id_idx').on(t.agentId),
  changedAtIdx: index('status_history_changed_at_idx').on(t.changedAt),
}))

// ─── Deals ────────────────────────────────────────────────────────────────────

export const transactionTypeEnum = pgEnum('transaction_type', ['off_plan', 'secondary'])

export const deals = pgTable('deals', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id').notNull().references(() => agents.id, { onDelete: 'restrict' }),

  // Property reference (external system ID or address)
  propertyRef: text('property_ref').notNull(),
  transactionType: transactionTypeEnum('transaction_type').notNull().default('secondary'),

  // Buyer is anonymous — only referenced by UUID
  buyerAnonymousId: uuid('buyer_anonymous_id').notNull().defaultRandom(),

  // Financials
  amount: decimal('amount', { precision: 14, scale: 2 }).notNull(),
  commissionRate: decimal('commission_rate', { precision: 5, scale: 4 }).notNull(),
  commissionAmount: decimal('commission_amount', { precision: 12, scale: 2 }).notNull(),
  vatAmount: decimal('vat_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  vatIncluded: boolean('vat_included').notNull().default(false),

  status: dealStatusEnum('status').notNull().default('pending'),

  // Timestamps
  signedAt: timestamp('signed_at', { withTimezone: true }),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  agentIdx: index('deals_agent_id_idx').on(t.agentId),
  statusIdx: index('deals_status_idx').on(t.status),
}))

// ─── Commission Advances ──────────────────────────────────────────────────────

export const commissionAdvances = pgTable('commission_advances', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id').notNull().references(() => agents.id, { onDelete: 'restrict' }),
  dealId: uuid('deal_id').references(() => deals.id, { onDelete: 'set null' }),

  amountRequested: decimal('amount_requested', { precision: 12, scale: 2 }).notNull(),
  status: advanceStatusEnum('status').notNull().default('requested'),

  requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
  decidedAt: timestamp('decided_at', { withTimezone: true }),
  decidedBy: uuid('decided_by').references(() => profiles.id, { onDelete: 'set null' }),

  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  agentIdx: index('advances_agent_id_idx').on(t.agentId),
  statusIdx: index('advances_status_idx').on(t.status),
}))

// ─── CMS Pages ────────────────────────────────────────────────────────────────

export const cmsPages = pgTable('cms_pages', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 128 }).notNull().unique(),
  title: text('title').notNull(),
  draftJson: jsonb('draft_json'),
  publishedJson: jsonb('published_json'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  updatedBy: uuid('updated_by').references(() => profiles.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ─── CMS Sections ─────────────────────────────────────────────────────────────

export const cmsSections = pgTable('cms_sections', {
  id: uuid('id').primaryKey().defaultRandom(),
  pageId: uuid('page_id').notNull().references(() => cmsPages.id, { onDelete: 'cascade' }),
  key: varchar('key', { length: 64 }).notNull(),
  order: integer('order').notNull().default(0),
  contentJson: jsonb('content_json'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  pageKeyIdx: uniqueIndex('cms_sections_page_key_idx').on(t.pageId, t.key),
}))

// ─── CMS Media ────────────────────────────────────────────────────────────────

export const cmsMedia = pgTable('cms_media', {
  id: uuid('id').primaryKey().defaultRandom(),
  storagePath: text('storage_path').notNull().unique(),
  mime: varchar('mime', { length: 64 }).notNull(),
  width: integer('width'),
  height: integer('height'),
  sizeBytes: integer('size_bytes'),
  alt: text('alt'),
  uploadedBy: uuid('uploaded_by').references(() => profiles.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ─── CMS Form Schemas ─────────────────────────────────────────────────────────

export const cmsFormSchemas = pgTable('cms_form_schemas', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 128 }).notNull(),
  version: integer('version').notNull().default(1),
  fieldsJson: jsonb('fields_json').notNull(),
  isActive: boolean('is_active').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  slugVersionIdx: uniqueIndex('form_schemas_slug_version_idx').on(t.slug, t.version),
  activeIdx: index('form_schemas_active_idx').on(t.slug, t.isActive),
}))

// ─── Site Config ──────────────────────────────────────────────────────────────

export const siteConfig = pgTable('site_config', {
  id: integer('id').primaryKey().default(1), // singleton — always id=1
  contactEmail: varchar('contact_email', { length: 256 }),
  whatsapp: varchar('whatsapp', { length: 32 }),
  socialJson: jsonb('social_json'), // { instagram, linkedin, twitter, youtube }
  seoJson: jsonb('seo_json'),       // { title, description, keywords, ogImage }
  analyticsJson: jsonb('analytics_json'), // { gaId, metaPixelId }
  featureFlagsJson: jsonb('feature_flags_json'),
  updatedBy: uuid('updated_by').references(() => profiles.id, { onDelete: 'set null' }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ─── Audit Logs ───────────────────────────────────────────────────────────────

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorId: uuid('actor_id').references(() => profiles.id, { onDelete: 'set null' }),
  action: varchar('action', { length: 64 }).notNull(), // e.g. 'agent.status_change'
  entity: varchar('entity', { length: 64 }).notNull(), // table name
  entityId: uuid('entity_id'),
  beforeJson: jsonb('before_json'),
  afterJson: jsonb('after_json'),
  ip: varchar('ip', { length: 64 }),
  ua: text('ua'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  actorIdx: index('audit_logs_actor_id_idx').on(t.actorId),
  entityIdx: index('audit_logs_entity_idx').on(t.entity, t.entityId),
  createdAtIdx: index('audit_logs_created_at_idx').on(t.createdAt),
}))

// ─── Relations ────────────────────────────────────────────────────────────────

export const profilesRelations = relations(profiles, ({ many }) => ({
  assignedAgents: many(agents, { relationName: 'assignedAgents' }),
  authoredNotes: many(agentNotes),
  statusChanges: many(agentStatusHistory),
}))

export const agentsRelations = relations(agents, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [agents.profileId],
    references: [profiles.id],
  }),
  assignedTo: one(profiles, {
    fields: [agents.assignedTo],
    references: [profiles.id],
    relationName: 'assignedAgents',
  }),
  notes: many(agentNotes),
  statusHistory: many(agentStatusHistory),
  deals: many(deals),
  advances: many(commissionAdvances),
}))

export const agentNotesRelations = relations(agentNotes, ({ one }) => ({
  agent: one(agents, { fields: [agentNotes.agentId], references: [agents.id] }),
  author: one(profiles, { fields: [agentNotes.authorId], references: [profiles.id] }),
}))

export const agentStatusHistoryRelations = relations(agentStatusHistory, ({ one }) => ({
  agent: one(agents, { fields: [agentStatusHistory.agentId], references: [agents.id] }),
  changedBy: one(profiles, { fields: [agentStatusHistory.changedBy], references: [profiles.id] }),
}))

export const dealsRelations = relations(deals, ({ one, many }) => ({
  agent: one(agents, { fields: [deals.agentId], references: [agents.id] }),
  advances: many(commissionAdvances),
}))

export const commissionAdvancesRelations = relations(commissionAdvances, ({ one }) => ({
  agent: one(agents, { fields: [commissionAdvances.agentId], references: [agents.id] }),
  deal: one(deals, { fields: [commissionAdvances.dealId], references: [deals.id] }),
  decidedBy: one(profiles, { fields: [commissionAdvances.decidedBy], references: [profiles.id] }),
}))

export const cmsPagesRelations = relations(cmsPages, ({ many }) => ({
  sections: many(cmsSections),
}))

export const cmsSectionsRelations = relations(cmsSections, ({ one }) => ({
  page: one(cmsPages, { fields: [cmsSections.pageId], references: [cmsPages.id] }),
}))

// ─── Types ────────────────────────────────────────────────────────────────────

export type Profile = typeof profiles.$inferSelect
export type NewProfile = typeof profiles.$inferInsert
export type Role = (typeof roleEnum.enumValues)[number]
export type ProfileStatus = (typeof profileStatusEnum.enumValues)[number]

export type Agent = typeof agents.$inferSelect
export type NewAgent = typeof agents.$inferInsert
export type ApplicationStatus = (typeof applicationStatusEnum.enumValues)[number]
export type DealVolume = (typeof dealVolumeEnum.enumValues)[number]
export type KycStatus = (typeof kycStatusEnum.enumValues)[number]

export type AgentNote = typeof agentNotes.$inferSelect
export type NewAgentNote = typeof agentNotes.$inferInsert

export type AgentStatusHistory = typeof agentStatusHistory.$inferSelect

export type Deal = typeof deals.$inferSelect
export type NewDeal = typeof deals.$inferInsert
export type DealStatus = (typeof dealStatusEnum.enumValues)[number]

export type CommissionAdvance = typeof commissionAdvances.$inferSelect
export type NewCommissionAdvance = typeof commissionAdvances.$inferInsert
export type AdvanceStatus = (typeof advanceStatusEnum.enumValues)[number]

export type CmsPage = typeof cmsPages.$inferSelect
export type CmsSection = typeof cmsSections.$inferSelect
export type CmsMedia = typeof cmsMedia.$inferSelect
export type CmsFormSchema = typeof cmsFormSchemas.$inferSelect
export type SiteConfig = typeof siteConfig.$inferSelect
export type AuditLog = typeof auditLogs.$inferSelect

// ─── Constants ────────────────────────────────────────────────────────────────

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

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  'applied',
  'contacted',
  'qualified',
  'approved',
  'active',
  'rejected',
  'inactive',
]

// Valid transitions for the agent status state machine
export const VALID_STATUS_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  applied:   ['contacted', 'rejected'],
  contacted: ['qualified', 'rejected'],
  qualified: ['approved', 'rejected'],
  approved:  ['active', 'rejected'],
  active:    ['inactive', 'rejected'],
  rejected:  [],
  inactive:  ['active'],
}
