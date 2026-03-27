/**
 * OAuth redirect target after Google (or other provider) sign-in.
 *
 * Supabase only honors `redirectTo` if this URL is listed under
 * Authentication → URL Configuration → Redirect URLs in the Supabase dashboard.
 * If it is not allowlisted, Supabase falls back to "Site URL" (often another app).
 *
 * Set NEXT_PUBLIC_SITE_URL in Vercel to your PromptPerfect origin, e.g.
 * https://promptperfect-xxxx.vercel.app (no trailing slash).
 */
export function getOAuthCallbackUrl(): string {
  const envBase = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '')
  if (typeof window === 'undefined') {
    return envBase ? `${envBase}/auth/callback` : '/auth/callback'
  }
  const origin = envBase || window.location.origin
  return `${origin}/auth/callback`
}
