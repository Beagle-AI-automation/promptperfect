/**
 * OAuth + email-confirmation redirect targets for Supabase Auth.
 *
 * Supabase only honors these URLs if they are listed under
 * Authentication → URL Configuration → Redirect URLs (and Site URL is sensible).
 *
 * Set NEXT_PUBLIC_SITE_URL to your deployed origin (no trailing slash), e.g.
 * https://your-app.vercel.app — and for local dev either omit it (we derive
 * http://localhost:3000 from the incoming request in API routes) or set
 * NEXT_PUBLIC_SITE_URL=http://localhost:3000 explicitly.
 */

/** Public site origin for server-side auth redirects (signup email, etc.). */
export function getSiteOriginForAuth(request: Request): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '');
  if (env) return env;

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return vercel.startsWith('http')
      ? vercel.replace(/\/$/, '')
      : `https://${vercel}`;
  }

  const host =
    request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() ||
    request.headers.get('host')?.split(',')[0]?.trim();
  if (host) {
    const proto =
      request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || 'http';
    return `${proto}://${host}`;
  }

  return 'http://localhost:3000';
}

/** Full URL embedded in signup confirmation emails (`emailRedirectTo`). Must be allowlisted. */
export function getEmailConfirmationRedirectUrl(request: Request): string {
  return `${getSiteOriginForAuth(request)}/auth/callback`;
}

/**
 * OAuth redirect after Google (or other provider) sign-in — browser only.
 * Prefer NEXT_PUBLIC_SITE_URL when set (preview/staging domains).
 */
export function getOAuthCallbackUrl(): string {
  const envBase = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '');
  if (typeof window === 'undefined') {
    return envBase ? `${envBase}/auth/callback` : '/auth/callback';
  }
  const origin = envBase || window.location.origin;
  return `${origin}/auth/callback`;
}

/**
 * Password recovery redirect — browser only (`resetPasswordForEmail`).
 * Same origin rules as OAuth: allowlist `/auth/reset` in Supabase.
 */
export function getPasswordResetRedirectUrl(): string {
  const envBase = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '');
  if (typeof window === 'undefined') {
    return envBase ? `${envBase}/auth/reset` : '/auth/reset';
  }
  const origin = envBase || window.location.origin;
  return `${origin}/auth/reset`;
}
