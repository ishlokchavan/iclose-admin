import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db/client'
import { agents, profiles, cmsFormSchemas } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
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
    const dbSchema = await db.query.cmsFormSchemas.findFirst({
      where: and(
        eq(cmsFormSchemas.slug, 'agent-registration'),
        eq(cmsFormSchemas.isActive, true)
      ),
    })

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
  const [newAgent] = await db.insert(agents).values({
    fullName: validatedData.fullName,
    phoneEncrypted,
    emailEncrypted: emailEncrypted ?? undefined,
    isLicensedAgent: validatedData.isLicensedAgent,
    dealVolume: validatedData.dealVolume,
    applicationStatus: 'applied',
    source: validatedData.source,
    utmSource: validatedData.utmSource,
    utmMedium: validatedData.utmMedium,
    utmCampaign: validatedData.utmCampaign,
    utmContent: validatedData.utmContent,
    utmTerm: validatedData.utmTerm,
    ipHash,
    userAgent: ua,
  }).returning({ id: agents.id, anonymousId: agents.anonymousId })

  if (!newAgent) {
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
    const managerProfiles = await db.query.profiles.findMany({
      where: eq(profiles.role, 'agent_manager'),
      columns: { id: true },
    })

    // Note: emails for managers come from auth.users — in production
    // use supabase.auth.admin.listUsers() filtered by manager IDs
    // For now we log and skip if no Resend key
    if (managerProfiles.length > 0 && process.env.RESEND_API_KEY) {
      // Get manager emails via Supabase admin API
      const { createClient: createSupabaseAdmin } = await import('@supabase/supabase-js')
      const supabaseAdmin = createSupabaseAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      )
      const { data: users } = await supabaseAdmin.auth.admin.listUsers()
      const managerIds = new Set(managerProfiles.map((p) => p.id))
      const managerEmails = users?.users
        .filter((u) => managerIds.has(u.id) && u.email)
        .map((u) => u.email!) ?? []

      if (managerEmails.length > 0) {
        await sendNewAgentNotification(
          {
            fullName: validatedData.fullName,
            isLicensedAgent: validatedData.isLicensedAgent,
            applicationStatus: 'applied',
            appliedAt: new Date(),
          },
          managerEmails
        )
      }
    }
  } catch (err) {
    // Never let notification failure break the registration response
    console.error('[register] Notification failed:', err)
  }

  // 11. Return ticket — never echo input
  return NextResponse.json(
    { ok: true, ticket: newAgent.anonymousId },
    { status: 201, headers: cors }
  )
}
