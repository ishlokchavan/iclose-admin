import { z } from 'zod'

// ─── Site Config ──────────────────────────────────────────────────────────────

export const siteConfigSchema = z.object({
  contactEmail: z.string().email().optional().or(z.literal('')),
  whatsapp: z.string().max(32).optional().or(z.literal('')),
  social: z.object({
    instagram: z.string().url().optional().or(z.literal('')),
    linkedin: z.string().url().optional().or(z.literal('')),
    twitter: z.string().url().optional().or(z.literal('')),
    youtube: z.string().url().optional().or(z.literal('')),
  }).optional(),
  seo: z.object({
    title: z.string().max(70).optional(),
    description: z.string().max(160).optional(),
    keywords: z.string().max(500).optional(),
    ogImage: z.string().url().optional().or(z.literal('')),
  }).optional(),
  analytics: z.object({
    gaId: z.string().optional().or(z.literal('')),
    metaPixelId: z.string().optional().or(z.literal('')),
  }).optional(),
  featureFlags: z.record(z.boolean()).optional(),
})

export type SiteConfigData = z.infer<typeof siteConfigSchema>

// ─── Plan schema ──────────────────────────────────────────────────────────────

export const planSchema = z.object({
  id: z.string(),
  key: z.enum(['plus', 'pro', 'pro_max', 'ultra']),
  label: z.string().min(1).max(64),
  tagline: z.string().max(256).optional().or(z.literal('')),
  priceMonthlyAed: z.coerce.number().min(0).nullable().optional(),
  priceYearlyAed: z.coerce.number().min(0).nullable().optional(),
  billingCycle: z.enum(['free', 'monthly', 'yearly']),
  agentSplitPct: z.coerce.number().min(0).max(100),
  isStar: z.boolean().default(false),
  isActive: z.boolean().default(true),
  features: z.array(z.string()).optional(),
})

export type PlanData = z.infer<typeof planSchema>

// ─── FAQ schema ───────────────────────────────────────────────────────────────

export const faqItemSchema = z.object({
  id: z.string(),
  question: z.string().min(1).max(256),
  answer: z.string().min(1).max(2000),
  order: z.number().int().default(0),
})

export const faqsSchema = z.array(faqItemSchema)
export type FaqItem = z.infer<typeof faqItemSchema>

// ─── Form field schema ────────────────────────────────────────────────────────

export const formFieldSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(64),
  type: z.enum(['text', 'email', 'tel', 'select', 'radio', 'checkbox', 'textarea']),
  label: z.string().min(1).max(128),
  placeholder: z.string().max(128).optional(),
  required: z.boolean().default(false),
  options: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
  validation: z.object({
    minLength: z.number().optional(),
    maxLength: z.number().optional(),
    pattern: z.string().optional(),
  }).optional(),
  order: z.number().int().default(0),
  isActive: z.boolean().default(true),
})

export const formSchemaSchema = z.object({
  slug: z.string(),
  version: z.number().int(),
  fields: z.array(formFieldSchema),
  isActive: z.boolean(),
})

export type FormField = z.infer<typeof formFieldSchema>
export type FormSchemaData = z.infer<typeof formSchemaSchema>

// ─── Section schemas ──────────────────────────────────────────────────────────

export const heroSchema = z.object({
  headline: z.string().max(200),
  subhead: z.string().max(500).optional(),
  ctaPrimary: z.object({ label: z.string(), href: z.string() }).optional(),
  ctaSecondary: z.object({ label: z.string(), href: z.string() }).optional(),
})

export const statsSchema = z.object({
  items: z.array(z.object({
    value: z.string().max(32),
    label: z.string().max(64),
  })).max(6),
})
