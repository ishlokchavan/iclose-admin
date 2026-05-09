import 'server-only'

/**
 * Sliding window rate limiter using Upstash Redis.
 * Falls back to a no-op in development if Redis is not configured.
 */

interface RateLimitResult {
  success: boolean
  remaining: number
  reset: number
}

export async function rateLimit(
  identifier: string,
  opts: { requests: number; windowMs: number }
): Promise<RateLimitResult> {
  const restUrl = process.env.UPSTASH_REDIS_REST_URL
  const restToken = process.env.UPSTASH_REDIS_REST_TOKEN

  // No-op in dev if Redis not configured
  if (!restUrl || !restToken) {
    if (process.env.NODE_ENV === 'development') {
      return { success: true, remaining: opts.requests - 1, reset: Date.now() + opts.windowMs }
    }
    throw new Error('Upstash Redis is not configured')
  }

  const { Ratelimit } = await import('@upstash/ratelimit')
  const { Redis } = await import('@upstash/redis')

  const redis = new Redis({ url: restUrl, token: restToken })
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(opts.requests, `${opts.windowMs}ms`),
    prefix: 'iclose:rl',
  })

  const result = await limiter.limit(identifier)

  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
  }
}
