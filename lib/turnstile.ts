import 'server-only'

/**
 * Cloudflare Turnstile server-side verification.
 * Falls back to pass-through in development if secret key not set.
 */
export async function verifyTurnstile(token: string | null): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY

  // Allow bypass in dev without key
  if (!secretKey) {
    if (process.env.NODE_ENV === 'development') return true
    throw new Error('TURNSTILE_SECRET_KEY is not configured')
  }

  if (!token) return false

  const response = await fetch(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: secretKey, response: token }),
    }
  )

  if (!response.ok) return false

  const data = (await response.json()) as { success: boolean }
  return data.success === true
}
