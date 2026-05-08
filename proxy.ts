import { NextRequest, NextResponse } from 'next/server'
import { createProxyClient } from '@/lib/supabase/proxy'

// ─── Route protection config ──────────────────────────────────────────────────

const PROTECTED_ADMIN_ROUTES = ['/dashboard']
const PROTECTED_AGENT_ROUTES = ['/portal']
const PUBLIC_ROUTES = ['/login', '/forgot-password', '/api/agent', '/api/cms']

function isProtectedAdmin(pathname: string) {
  return PROTECTED_ADMIN_ROUTES.some((r) => pathname.startsWith(r))
}

function isProtectedAgent(pathname: string) {
  return PROTECTED_AGENT_ROUTES.some((r) => pathname.startsWith(r))
}

function isPublicApi(pathname: string) {
  return PUBLIC_ROUTES.some((r) => pathname.startsWith(r))
}

// ─── Nonce generation ─────────────────────────────────────────────────────────

function generateNonce(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Buffer.from(array).toString('base64')
}

// ─── Security headers ─────────────────────────────────────────────────────────

function applySecurityHeaders(
  response: NextResponse,
  nonce: string,
  isProd: boolean
): NextResponse {
  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' ${!isProd ? "'unsafe-eval'" : ''} https://www.googletagmanager.com https://connect.facebook.net https://challenges.cloudflare.com`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: https: blob:`,
    `font-src 'self' data:`,
    `connect-src 'self' https://*.supabase.co https://api.resend.com https://challenges.cloudflare.com`,
    `frame-src https://challenges.cloudflare.com`,
    `frame-ancestors 'none'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `upgrade-insecure-requests`,
  ].join('; ')

  // Content Security Policy
  response.headers.set('Content-Security-Policy', csp)

  // HSTS — only in production
  if (isProd) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    )
  }

  // Clickjacking protection
  response.headers.set('X-Frame-Options', 'DENY')

  // MIME sniffing protection
  response.headers.set('X-Content-Type-Options', 'nosniff')

  // Referrer policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Permissions policy — restrict sensitive APIs
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()'
  )

  // Pass nonce to downstream rendering
  response.headers.set('x-nonce', nonce)

  return response
}

// ─── Login throttling (simple in-memory counter — upgrade to Redis in Phase 4) ──

const loginAttempts = new Map<string, { count: number; resetAt: number }>()
const LOGIN_LIMIT = 5
const LOGIN_WINDOW_MS = 15 * 60 * 1000 // 15 minutes

function checkLoginThrottle(ip: string): boolean {
  const now = Date.now()
  const entry = loginAttempts.get(ip)

  if (!entry || entry.resetAt < now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS })
    return true // allowed
  }

  if (entry.count >= LOGIN_LIMIT) {
    return false // blocked
  }

  entry.count++
  return true // allowed
}

// ─── Main proxy function ──────────────────────────────────────────────────────

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl
  const isProd = process.env.NODE_ENV === 'production'
  const nonce = generateNonce()

  // Force HTTPS redirect in production
  if (isProd && request.headers.get('x-forwarded-proto') === 'http') {
    const httpsUrl = request.nextUrl.clone()
    httpsUrl.protocol = 'https:'
    return NextResponse.redirect(httpsUrl, { status: 301 })
  }

  // Throttle login endpoint
  if (pathname === '/api/auth/login' && request.method === 'POST') {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      '0.0.0.0'

    if (!checkLoginThrottle(ip)) {
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: { 'Retry-After': '900' },
      })
    }
  }

  // Pass public API routes through without session check
  if (isPublicApi(pathname)) {
    const response = NextResponse.next()
    return applySecurityHeaders(response, nonce, isProd)
  }

  // Create a mutable response for session cookie propagation
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  // Refresh the Supabase session — this is the primary purpose of this proxy
  const { supabase } = createProxyClient(request, response)
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Gate admin routes
  if (isProtectedAdmin(pathname)) {
    if (!session) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      loginUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Gate agent portal routes
  if (isProtectedAgent(pathname)) {
    if (!session) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      loginUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(loginUrl)
    }
    // Phase 1: add role check — reject non-agent roles here
  }

  // Redirect logged-in users away from login page
  if (session && (pathname === '/login' || pathname === '/forgot-password')) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/dashboard'
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect root to dashboard
  if (pathname === '/') {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = session ? '/dashboard' : '/login'
    return NextResponse.redirect(redirectUrl)
  }

  response = applySecurityHeaders(response, nonce, isProd)
  return response
}

// ─── Matcher config (exported for middleware.ts) ───────────────────────────────

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
