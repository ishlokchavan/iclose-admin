import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export const revalidate = 300

const CORS = { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' }

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const sb = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (sb as any).from('cms_form_schemas').select('slug, version, fields_json').eq('slug', slug).eq('is_active', true).single()
  if (!data) return NextResponse.json({ error: 'Form schema not found' }, { status: 404, headers: CORS })
  return NextResponse.json(data, { headers: CORS })
}
