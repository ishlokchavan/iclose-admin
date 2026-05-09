'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { requireRole } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { siteConfigSchema, faqsSchema, type FaqItem } from '@/lib/cms-schemas'

const sb = () => createServiceClient()

// ─── Site Config ──────────────────────────────────────────────────────────────

export async function getSiteConfig() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (sb() as any).from('site_config').select('*').eq('id', 1).single()
  return data ?? null
}

export async function updateSiteConfig(formData: FormData) {
  await requireRole(['super_admin', 'content_manager'])

  const raw = {
    contactEmail: formData.get('contactEmail') as string,
    whatsapp: formData.get('whatsapp') as string,
    social: {
      instagram: formData.get('social.instagram') as string,
      linkedin: formData.get('social.linkedin') as string,
      twitter: formData.get('social.twitter') as string,
      youtube: formData.get('social.youtube') as string,
    },
    seo: {
      title: formData.get('seo.title') as string,
      description: formData.get('seo.description') as string,
      keywords: formData.get('seo.keywords') as string,
      ogImage: formData.get('seo.ogImage') as string,
    },
    analytics: {
      gaId: formData.get('analytics.gaId') as string,
      metaPixelId: formData.get('analytics.metaPixelId') as string,
    },
  }

  const parsed = siteConfigSchema.safeParse(raw)
  if (!parsed.success) return { ok: false as const, error: parsed.error.errors[0]?.message }

  const d = parsed.data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (sb() as any).from('site_config').upsert({
    id: 1,
    contact_email: d.contactEmail,
    whatsapp: d.whatsapp,
    social_json: d.social,
    seo_json: d.seo,
    analytics_json: d.analytics,
    updated_at: new Date().toISOString(),
  })

  revalidatePath('/dashboard/cms')
  return { ok: true as const }
}

// ─── Plans ────────────────────────────────────────────────────────────────────

export async function getPlansForCms() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (sb() as any).from('plans').select('*').order('order')
  return data ?? []
}

export async function updatePlan(formData: FormData) {
  await requireRole(['super_admin', 'content_manager'])

  const id = formData.get('id') as string
  const featuresRaw = formData.get('features') as string

  let features: string[] = []
  try { features = JSON.parse(featuresRaw) } catch { features = featuresRaw.split('\n').filter(Boolean) }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (sb() as any).from('plans').update({
    label: formData.get('label'),
    tagline: formData.get('tagline'),
    price_monthly_aed: formData.get('priceMonthlyAed') || null,
    price_yearly_aed: formData.get('priceYearlyAed') || null,
    billing_cycle: formData.get('billingCycle'),
    agent_split_pct: parseInt(formData.get('agentSplitPct') as string),
    is_star: formData.get('isStar') === 'true',
    is_active: formData.get('isActive') === 'true',
    features_json: features,
    updated_at: new Date().toISOString(),
  }).eq('id', id)

  revalidatePath('/dashboard/cms')
  return { ok: true as const }
}

// ─── FAQs ─────────────────────────────────────────────────────────────────────

export async function getFaqs(): Promise<FaqItem[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (sb() as any).from('cms_sections')
    .select('content_json')
    .eq('key', 'faqs')
    .single()

  if (!data?.content_json) return []
  try {
    const parsed = faqsSchema.safeParse(data.content_json)
    return parsed.success ? parsed.data : []
  } catch { return [] }
}

export async function saveFaqs(faqs: FaqItem[]) {
  await requireRole(['super_admin', 'content_manager'])

  // Get or create the faqs section
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: page } = await (sb() as any).from('cms_pages').select('id').eq('slug', 'home').single()

  let pageId = page?.id
  if (!pageId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: newPage } = await (sb() as any).from('cms_pages').insert({
      slug: 'home', title: 'iClose Home', draft_json: {}, published_json: {},
    }).select('id').single()
    pageId = newPage?.id
  }

  if (!pageId) return { ok: false as const, error: 'Could not get page' }

  // Upsert the faqs section
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (sb() as any).from('cms_sections').select('id').eq('key', 'faqs').single()

  if (existing) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (sb() as any).from('cms_sections').update({
      content_json: faqs, updated_at: new Date().toISOString(),
    }).eq('key', 'faqs')
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (sb() as any).from('cms_sections').insert({
      page_id: pageId, key: 'faqs', order: 0, content_json: faqs,
    })
  }

  revalidatePath('/dashboard/cms')
  return { ok: true as const }
}

// ─── Form Schema ──────────────────────────────────────────────────────────────

export async function getFormSchema(slug = 'agent-registration') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (sb() as any).from('cms_form_schemas')
    .select('*')
    .eq('slug', slug)
    .order('version', { ascending: false })
    .limit(1)
    .single()
  return data ?? null
}

export async function saveFormSchema(slug: string, fields: unknown[]) {
  await requireRole(['super_admin', 'content_manager'])

  // Deactivate old versions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (sb() as any).from('cms_form_schemas').update({ is_active: false }).eq('slug', slug)

  // Get latest version number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: latest } = await (sb() as any).from('cms_form_schemas')
    .select('version').eq('slug', slug).order('version', { ascending: false }).limit(1).single()

  const version = (latest?.version ?? 0) + 1

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (sb() as any).from('cms_form_schemas').insert({
    slug, version, fields_json: fields, is_active: true,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  })

  revalidatePath('/dashboard/cms')
  return { ok: true as const }
}
