import { isUnlimitedMode } from '@/lib/localMode'

/** Fixed 60s window per key. */
const WINDOW_MS = 60_000

/**
 * Hard cap on tracked keys. Without it, a flood of distinct `x-forwarded-for`
 * values grows the map without bound for as long as the process lives.
 */
const MAX_TRACKED_KEYS = 10_000

const attempts = new Map<string, { count: number; resetAt: number }>()

/** Drop windows that already expired. Keeps the map bounded under hostile traffic. */
function pruneExpired(now: number): void {
  for (const [key, record] of attempts) {
    if (now > record.resetAt) attempts.delete(key)
  }
}

/**
 * Sliding-window budget for one bucket key. Pass a `rateLimitKey(...)` value so
 * each route keeps its own budget; an IP-only key would let one endpoint's
 * traffic lock callers out of every other endpoint.
 */
export function checkRateLimit(key: string, maxAttempts = 5): boolean {
  // Unlimited local-dev mode: no throttling.
  if (isUnlimitedMode()) return true
  const now = Date.now()
  if (attempts.size >= MAX_TRACKED_KEYS) pruneExpired(now)
  const record = attempts.get(key)
  if (!record || now > record.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }
  if (record.count >= maxAttempts) return false
  record.count++
  return true
}

/** Test seam: forget every tracked window. */
export function resetRateLimits(): void {
  attempts.clear()
}

/** Diagnostics/test seam: how many windows are currently tracked. */
export function trackedRateLimitKeys(): number {
  return attempts.size
}

/**
 * Best-effort client IP for rate-limit keys. `x-forwarded-for` is client
 * controlled and therefore spoofable — treat it as a weak key, never as an
 * authorization input.
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const first = forwarded?.split(',')[0]?.trim()
  return first && first.length > 0 ? first.slice(0, 64) : 'unknown'
}

/**
 * Rate-limit bucket key.
 *
 * The key must include the route, not just the IP: with an IP-only key a
 * caller who exhausts one endpoint's budget (say `/api/feedback` at 30/min)
 * would also lock legitimate users out of every other endpoint behind the same
 * proxy (say `/api/auth/login` at 5/min). Namespacing per route keeps each
 * budget independent and stops one noisy endpoint from becoming a DoS vector
 * against the rest of the app.
 */
export function rateLimitKey(route: string, req: Request): string {
  return `${route}:${getClientIp(req)}`
}

/** Shared 429 body/status so throttled routes stay consistent. */
export function rateLimitResponse(): Response {
  return Response.json(
    { error: 'Too many requests. Please slow down.' },
    { status: 429 },
  )
}

/**
 * Route guard: returns a 429 `Response` when the caller exceeds `maxAttempts`
 * per minute, or `null` when the request may proceed.
 *
 * Usage:
 *   const limited = enforceRateLimit('auth/login', req, 5)
 *   if (limited) return limited
 */
export function enforceRateLimit(
  route: string,
  req: Request,
  maxAttempts: number,
): Response | null {
  return checkRateLimit(rateLimitKey(route, req), maxAttempts)
    ? null
    : rateLimitResponse()
}
