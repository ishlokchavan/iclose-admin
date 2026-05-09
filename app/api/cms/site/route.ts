import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export const revalidate = 60 // cache for 60s

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function GET() {
  try {
    const sb = createServiceClient()

    const [siteConfig, sections, plans, faqs, formSchema] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sb as any).from('site_config').select('*').eq('id', 1).single(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sb as any).from('cms_sections').select('key, content_json, order').order('order'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sb as any).from('plans').select('key, label, tagline, price_monthly_aed, price_yearly_aed, billing_cycle, agent_split_pct, is_star, features_json').eq('is_active', true).order('order'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sb as any).from('cms_sections').select('content_json').eq('key', 'faqs').single(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sb as any).from('cms_form_schemas').select('slug, version, fields_json').eq('slug', 'agent-registration').eq('is_active', true).single(),
    ])

    return NextResponse.json({
      siteConfig: siteConfig.data,
      sections: sections.data ?? [],
      plans: plans.data ?? [],
      faqs: faqs.data?.content_json ?? [],
      formSchema: formSchema.data,
      cachedAt: new Date().toISOString(),
    }, { headers: CORS })
  } catch (err) {
    console.error('[cms/site]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500, headers: CORS })
  }
}
