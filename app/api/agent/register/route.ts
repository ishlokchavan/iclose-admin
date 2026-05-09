import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/service'
import { agents, profiles, cmsFormSchemas } from '@/db/schema'
import { rateLimit } from '@/lib/rate-limit'
import { verifyTurnstile } from '@/lib/turnstile'
import { encrypt, hashPii } from '@/lib/encryption'
import { sendNewAgentNotification } from '@/lib/email'
import { writeAudit } from '@/lib/audit'

// ─── CORS ─────────────────────────────────────────────────────────────────────

const ALLOWED_ORIGINS = [
  process.env.PUBLIC_SITE_ORIGIN ?? 'https://iclose.ae',
  'http://localhost:3001', // public site dev
]

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

// ─── Fallback validation schema (used if no active DB form schema) ─────────────

const fallbackSchema = z.object({
  fullName: z.string().min(2, 'Full name is required').max(128),
  email: z.string().email('Valid email required').optional(),
  phone: z.string().min(7, 'Valid phone required').max(32),
  isLicensedAgent: z.boolean(),
  dealVolume: z.enum(['0-1', '1-3', '3-5', '5-10', '10+']).optional(),
  source: z.string().max(128).optional(),
  utmSource: z.string().max(128).optional(),
  utmMedium: z.string().max(128).optional(),
  utmCampaign: z.string().max(128).optional(),
  utmContent: z.string().max(128).optional(),
  utmTerm: z.string().max(128).optional(),
  // Honeypot
  website: z.string().max(0, 'Bot detected').optional(),
  // Turnstile
  cfTurnstileResponse: z.string().optional(),
})

// ─── OPTIONS (preflight) ──────────────────────────────────────────────────────

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) })
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin')
  const cors = corsHeaders(origin)

  // 1. CORS check — reject non-allowlisted origins in production
  if (process.env.NODE_ENV === 'production' && origin && !ALLOWED_ORIGINS.includes(origin)) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403, headers: cors })
  }

  // 2. Rate limit — 5 requests per IP per 10 minutes
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'anonymous'

  const limited = await rateLimit(`register:${ip}`, { requests: 5, windowMs: 10 * 60 * 1000 })
  if (!limited.success) {
    return NextResponse.json(
      { ok: false, error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { ...cors, 'Retry-After': '600' } }
    )
  }

  const sb = createServiceClient()

  // 3. Parse body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body' }, { status: 400, headers: cors })
  }

  // 4. Honeypot check
  const rawBody = body as Record<string, unknown>
  if (rawBody.website && String(rawBody.website).length > 0) {
    // Silent success — don't tell bots they were caught
    return NextResponse.json({ ok: true, ticket: crypto.randomUUID() }, { status: 200, headers: cors })
  }

  // 5. Turnstile verification
  const turnstileToken = rawBody.cfTurnstileResponse as string | null
  const turnstileOk = await verifyTurnstile(turnstileToken)
  if (!turnstileOk) {
    return NextResponse.json(
      { ok: false, error: 'Bot verification failed. Please refresh and try again.' },
      { status: 400, headers: cors }
    )
  }

  // 6. Try to load active form schema from DB, fall back to hardcoded
  let validatedData: z.infer<typeof fallbackSchema>
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: dbSchema } = await (sb as any).from('cms_form_schemas').select('*').eq('slug', 'agent-registration').eq('is_active', true).single()

    // For now always use fallback schema — Phase 6 will use DB schema
    const parsed = fallbackSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.errors[0]?.message ?? 'Validation failed' },
        { status: 422, headers: cors }
      )
    }
    validatedData = parsed.data
    void dbSchema // suppress unused warning until Phase 6
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Validation error' },
      { status: 422, headers: cors }
    )
  }

  // 7. Hash IP + encrypt PII
  const ipHash = await hashPii(ip)
  const phoneEncrypted = await encrypt(validatedData.phone)
  const emailEncrypted = validatedData.email ? await encrypt(validatedData.email) : null
  const ua = request.headers.get('user-agent') ?? undefined

  // 8. Insert agent row
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: newAgent, error: insertError } = await (sb as any).from('agents').insert({
    full_name: validatedData.fullName,
    phone_encrypted: phoneEncrypted,
    email_encrypted: emailEncrypted ?? null,
    is_licensed_agent: validatedData.isLicensedAgent,
    deal_volume: validatedData.dealVolume ?? null,
    application_status: 'applied',
    source: validatedData.source ?? null,
    utm_source: validatedData.utmSource ?? null,
    utm_medium: validatedData.utmMedium ?? null,
    utm_campaign: validatedData.utmCampaign ?? null,
    utm_content: validatedData.utmContent ?? null,
    utm_term: validatedData.utmTerm ?? null,
    ip_hash: ipHash,
    user_agent: ua ?? null,
  }).select('id, anonymous_id').single()

  if (insertError || !newAgent) {
    return NextResponse.json(
      { ok: false, error: 'Registration failed. Please try again.' },
      { status: 500, headers: cors }
    )
  }

  // 9. Audit log
  await writeAudit({
    actorId: null,
    action: 'agent.registered',
    entity: 'agents',
    entityId: newAgent.id,
    after: {
      fullName: validatedData.fullName,
      isLicensedAgent: validatedData.isLicensedAgent,
      source: validatedData.source,
    },
    ip: ipHash,
    ua,
  })

  // 10. Notify agent managers via email
  try {
    if (process.env.RESEND_API_KEY) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: managerProfiles } = await (sb as any).from('profiles').select('id').eq('role', 'agent_manager')
      if (managerProfiles?.length > 0) {
      const { data: users } = await sb.auth.admin.listUsers()
      const managerIds = new Set((managerProfiles ?? []).map((p: {id: string}) => p.id))
      const managerEmails = users?.users.filter((u) => managerIds.has(u.id) && u.email).map((u) => u.email!) ?? []
      if (managerEmails.length > 0) {
        await sendNewAgentNotification({ fullName: validatedData.fullName, isLicensedAgent: validatedData.isLicensedAgent, applicationStatus: 'applied', appliedAt: new Date() }, managerEmails)
      }
    }}
  } catch (err) {
    // Never let notification failure break the registration response
    console.error('[register] Notification failed:', err)
  }

  // 11. Return ticket — never echo input
  return NextResponse.json(
    { ok: true, ticket: newAgent.anonymous_id },
    { status: 201, headers: cors }
  )
}
