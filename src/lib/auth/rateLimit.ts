const attempts = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(ip: string, maxAttempts = 5): boolean {
  const now = Date.now()
  const record = attempts.get(ip)
  if (!record || now > record.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + 60000 })
    return true
  }
  if (record.count >= maxAttempts) return false
  record.count++
  return true
}
