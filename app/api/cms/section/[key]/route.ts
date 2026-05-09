import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export const revalidate = 60

const CORS = { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' }

export async function GET(_req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params
  const sb = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (sb as any).from('cms_sections').select('key, content_json, order').eq('key', key).single()
  if (!data) return NextResponse.json({ error: 'Section not found' }, { status: 404, headers: CORS })
  return NextResponse.json(data, { headers: CORS })
}
