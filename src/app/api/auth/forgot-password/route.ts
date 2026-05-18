import { checkRateLimit } from '@/lib/auth/rateLimit';
import {
  mapPasswordResetEmailError,
  resolvePasswordResetRedirect,
} from '@/lib/auth/passwordResetRedirect';
import { validateEmail } from '@/lib/auth/validation';
import {
  getSupabaseAdminClient,
  getSupabaseUrl,
  normalizeEnvValue,
} from '@/lib/client/supabase';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

function isLocalRedirect(redirectTo: string): boolean {
  try {
    const host = new URL(redirectTo).hostname;
    return host === 'localhost' || host === '127.0.0.1';
  } catch {
    return false;
  }
}

/**
 * Password recovery: admin generateLink (verifies user + builds link), then
 * resetPasswordForEmail (sends mail). On localhost, also returns recoveryLink
 * when Supabase email is rate-limited or undelivered.
 */
export async function POST(request: Request) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!checkRateLimit(ip, 8)) {
    return NextResponse.json(
      { error: 'Too many attempts. Please wait a minute.' },
      { status: 429 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    email?: string;
    redirectTo?: string;
  } | null;
  const raw = typeof body?.email === 'string' ? body.email.trim() : '';
  const email = raw.toLowerCase();
  const clientRedirectTo =
    typeof body?.redirectTo === 'string' ? body.redirectTo.trim() : undefined;

  if (!validateEmail(email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
  }

  const url = getSupabaseUrl();
  const anonKey = normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!url || !anonKey) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
  }

  const admin = getSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json(
      {
        error:
          'Password reset is temporarily unavailable (server configuration).',
        code: 'SERVICE_KEY_REQUIRED',
        hint:
          'Set SUPABASE_SERVICE_ROLE_KEY in .env.local (Supabase → Settings → API → service_role secret).',
      },
      { status: 503 },
    );
  }

  const redirectTo = resolvePasswordResetRedirect(request, clientRedirectTo);
  const localDev = isLocalRedirect(redirectTo);

  const { data: linkData, error: genError } =
    await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo },
    });

  if (genError) {
    const msg = genError.message?.trim().toLowerCase() ?? '';
    const notFound =
      genError.status === 404 ||
      msg.includes('not found') ||
      msg.includes('no user') ||
      msg.includes('user not found') ||
      msg.includes('unable to find');
    if (notFound) {
      return NextResponse.json(
        {
          error:
            'No account exists for this email. Sign up first, or use Continue with Google on the login page if you registered that way.',
          code: 'ACCOUNT_NOT_FOUND',
        },
        { status: 404 },
      );
    }
    console.error('[forgot-password] generateLink error:', genError.message);
    const mapped = mapPasswordResetEmailError(genError.message, redirectTo);
    return NextResponse.json(
      { error: mapped.error, code: mapped.code },
      { status: 400 },
    );
  }

  if (!linkData?.user?.id) {
    return NextResponse.json(
      {
        error:
          'No account exists for this email. Sign up first, or use Continue with Google on the login page.',
        code: 'ACCOUNT_NOT_FOUND',
      },
      { status: 404 },
    );
  }

  const recoveryLink =
    typeof linkData.properties?.action_link === 'string'
      ? linkData.properties.action_link
      : undefined;

  const identities = linkData.user.identities ?? [];
  const signedUpWithGoogleOnly =
    identities.length > 0 &&
    identities.every((i: { provider?: string }) => i.provider === 'google');

  const anon = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { error: emailError } = await anon.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (!emailError) {
    return NextResponse.json({
      ok: true,
      emailSent: true,
      ...(localDev && recoveryLink ? { recoveryLink } : {}),
      googleOnlyHint: signedUpWithGoogleOnly
        ? 'This account uses Google sign-in. You can still set a password from the reset link, or use Continue with Google on the login page.'
        : undefined,
    });
  }

  const msg = emailError.message?.trim() || '';
  console.error('[forgot-password] resetPasswordForEmail error:', msg);
  const mapped = mapPasswordResetEmailError(msg, redirectTo);

  // Local dev: Supabase rate-limits emails (~1/min) but generateLink still works.
  // Return the direct recovery link so you can reset without waiting on mail.
  if (localDev && recoveryLink) {
    return NextResponse.json({
      ok: true,
      emailSent: false,
      recoveryLink,
      code: mapped.code,
      message: mapped.error,
      googleOnlyHint: signedUpWithGoogleOnly
        ? 'This account uses Google sign-in. Open the link below to set a password, or use Continue with Google.'
        : undefined,
    });
  }

  return NextResponse.json(
    {
      error: mapped.error,
      code: mapped.code,
      hint:
        mapped.code === 'REDIRECT_NOT_ALLOWLISTED'
          ? `Add "${redirectTo}" in Supabase → Authentication → URL Configuration → Redirect URLs.`
          : mapped.code === 'EMAIL_RATE_LIMIT'
            ? 'Wait one minute, then try again. Check spam for an earlier email.'
            : 'Ask your project admin to enable Auth emails or custom SMTP in Supabase.',
    },
    { status: 400 },
  );
}
