/**
 * Seed CMS data — site config + form schema
 * Run: npx tsx db/seed-cms.ts
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { WebSocket as WS } from 'ws'
if (!globalThis.WebSocket) { (globalThis as never as {WebSocket: unknown}).WebSocket = WS }

dotenv.config({ path: '.env.local' })

async function seed() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Site config
  await (sb as never as {from: (t: string) => {upsert: (d: unknown) => Promise<void>}}).from('site_config').upsert({
    id: 1,
    contact_email: 'hello@iclose.ae',
    whatsapp: '+971501234567',
    social_json: { instagram: 'https://instagram.com/iclose.ae', linkedin: '', twitter: '', youtube: '' },
    seo_json: { title: 'iClose — Up to 100% Commission for Dubai Property Agents', description: 'Close Dubai property deals on your terms. Earn up to 100% commission, paid within 24 hours.', keywords: 'real estate agent commission Dubai, freelance real estate broker UAE', ogImage: 'https://iclose.ae/og-image.jpg' },
    analytics_json: { gaId: '', metaPixelId: '' },
  })

  // Create home page
  const { data: page } = await (sb as any).from('cms_pages').upsert({ slug: 'home', title: 'iClose Home', draft_json: {}, published_json: {} }, { onConflict: 'slug' }).select('id').single()
  const pageId = page?.id

  if (pageId) {
    // Seed faqs section
    await (sb as any).from('cms_sections').upsert({
      page_id: pageId, key: 'faqs', order: 0,
      content_json: [
        { id: '1', question: 'What is iClose?', answer: 'iClose is Dubai\'s broker platform that lets you keep up to 100% of your commission, get paid within 24 hours, and stay completely anonymous.', order: 0 },
        { id: '2', question: 'How quickly do I get paid?', answer: 'The moment the buyer commits, your commission lands. Same-day settlement, up to 90/10 advance available.', order: 1 },
        { id: '3', question: 'Do I need a broker license?', answer: 'No. iClose handles the regulatory side. You focus on closing deals.', order: 2 },
        { id: '4', question: 'Is my identity always anonymous?', answer: 'Yes. Buyers, developers, and even other agents only see the deal — never your identity or client list.', order: 3 },
      ],
    }, { onConflict: 'page_id, key' })
  }

  // Agent registration form schema
  await (sb as any).from('cms_form_schemas').insert({
    slug: 'agent-registration', version: 1, is_active: true,
    fields_json: [
      { id: '1', name: 'fullName', type: 'text', label: 'Full Name', placeholder: 'Your full name', required: true, order: 0, isActive: true },
      { id: '2', name: 'phone', type: 'tel', label: 'Phone', placeholder: '+971 50 123 4567', required: true, order: 1, isActive: true },
      { id: '3', name: 'email', type: 'email', label: 'Email (optional)', placeholder: 'you@example.com', required: false, order: 2, isActive: true },
      { id: '4', name: 'isLicensedAgent', type: 'radio', label: 'Are you a real estate agent?', required: true, order: 3, isActive: true, options: [{ label: 'Yes, I am', value: 'true' }, { label: 'No / Connector', value: 'false' }] },
      { id: '5', name: 'dealVolume', type: 'select', label: 'Monthly deal volume', required: true, order: 4, isActive: true, options: [{ label: '0-1 / month', value: '0-1' }, { label: '1-3 / month', value: '1-3' }, { label: '3-5 / month', value: '3-5' }, { label: '5-10 / month', value: '5-10' }, { label: '10+ / month', value: '10+' }] },
    ],
  })

  console.log('✅ CMS seeded: site config, FAQs, form schema')
  process.exit(0)
}

seed().catch(err => { console.error(err); process.exit(1) })
