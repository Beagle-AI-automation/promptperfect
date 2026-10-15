/**
 * Centralized structured logger for API routes. One JSON line per call in
 * production (route, latency, status, user, request id); human-readable in
 * dev. Replaces scattered `console.log/error` so logs are greppable and
 * request-correlatable. The request id is minted in `src/proxy.ts` and
 * forwarded as `x-request-id`.
 */

export function getRequestId(req: Request): string {
  const incoming = req.headers.get('x-request-id')?.trim();
  if (incoming) return incoming.slice(0, 64);
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

export interface ApiLogFields {
  status: number;
  ms: number;
  userId?: string | null;
  requestId?: string | null;
  error?: string | null;
  extra?: Record<string, string | number | boolean | null | undefined>;
}

export function logApi(route: string, fields: ApiLogFields): void {
  const { status, ms, userId, requestId, error, extra } = fields;
  if (process.env.NODE_ENV === 'production') {
    console.log(
      JSON.stringify({
        level: status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info',
        route,
        status,
        ms: Math.round(ms),
        ...(userId ? { userId } : {}),
        ...(requestId ? { requestId } : {}),
        ...(error ? { error } : {}),
        ...extra,
      }),
    );
    return;
  }
  const tag = status >= 500 ? 'ERROR' : status >= 400 ? 'WARN' : 'INFO';
  console.log(
    `[api:${route}] ${tag} ${status} in ${Math.round(ms)}ms` +
      (requestId ? ` req=${requestId.slice(0, 8)}` : '') +
      (userId ? ` user=${userId.slice(0, 8)}` : '') +
      (error ? ` :: ${error}` : ''),
  );
}

/** Dev-only warning that stays silent in production logs. */
export function logWarn(route: string, message: string): void {
  if (process.env.NODE_ENV === 'production') {
    console.log(JSON.stringify({ level: 'warn', route, message }));
    return;
  }
  console.warn(`[api:${route}] ${message}`);
}
