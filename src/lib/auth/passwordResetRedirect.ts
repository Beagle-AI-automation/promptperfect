/**
 * Build and validate password-recovery redirect URLs for Supabase allowlist.
 */
export function buildPasswordResetRedirectUrl(origin: string): string {
  return `${origin.replace(/\/$/, '')}/auth/reset`;
}

/** Client may suggest redirectTo; it must match the API request origin. */
export function resolvePasswordResetRedirect(
  request: Request,
  clientRedirectTo?: string,
): string {
  const host =
    request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() ||
    request.headers.get('host')?.split(',')[0]?.trim();
  const proto =
    request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || 'http';
  const requestOrigin = host ? `${proto}://${host}` : null;

  if (clientRedirectTo?.trim()) {
    try {
      const parsed = new URL(clientRedirectTo.trim());
      if (requestOrigin) {
        const expected = new URL(requestOrigin);
        if (
          parsed.protocol === expected.protocol &&
          parsed.host === expected.host &&
          parsed.pathname === '/auth/reset'
        ) {
          return parsed.origin + parsed.pathname;
        }
      }
    } catch {
      // fall through
    }
  }

  if (requestOrigin) {
    return buildPasswordResetRedirectUrl(requestOrigin);
  }

  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '');
  if (env) return buildPasswordResetRedirectUrl(env);

  return buildPasswordResetRedirectUrl('http://localhost:3000');
}

export function mapPasswordResetEmailError(
  message: string,
  redirectTo: string,
): { error: string; code: string } {
  const lower = message.toLowerCase();

  if (/redirect|url|allowlist|not allowed|invalid.*redirect/i.test(lower)) {
    return {
      code: 'REDIRECT_NOT_ALLOWLISTED',
      error: `Add this URL in Supabase → Authentication → URL Configuration → Redirect URLs: ${redirectTo}`,
    };
  }

  if (
    /rate limit|too many|email.*limit|over_email_send|security purposes|only request this after/i.test(
      lower,
    )
  ) {
    const secMatch = message.match(/after\s+(\d+)\s+seconds?/i);
    const waitSec = secMatch ? Number(secMatch[1]) : 60;
    return {
      code: 'EMAIL_RATE_LIMIT',
      error: `You already requested a reset link. Wait ${waitSec} seconds and try again (Supabase allows about one reset email per minute per address). Check your inbox and spam folder first — the last email may already be there.`,
    };
  }

  if (/smtp|mail|email.*provider|send.*email|not configured/i.test(lower)) {
    return {
      code: 'EMAIL_NOT_CONFIGURED',
      error:
        'Password reset email is not configured. In Supabase Dashboard → Project Settings → Authentication, enable email (or set up custom SMTP).',
    };
  }

  if (/user not found|not found|no user/i.test(lower)) {
    return {
      code: 'ACCOUNT_NOT_FOUND',
      error:
        'No account exists for this email address. Check spelling or create an account.',
    };
  }

  return {
    code: 'RESET_EMAIL_FAILED',
    error:
      process.env.NODE_ENV === 'production'
        ? 'Could not send reset email. Please try again later.'
        : `Could not send reset email: ${message}`,
  };
}
