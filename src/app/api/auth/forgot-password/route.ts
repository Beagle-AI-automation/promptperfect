import { checkRateLimit } from '@/lib/auth/rateLimit';
import { getPasswordResetOrigin } from '@/lib/auth/oauthRedirect';
import { validateEmail } from '@/lib/auth/validation';
import {
  getSupabaseAdminClient,
  getSupabaseUrl,
  normalizeEnvValue,
} from '@/lib/client/supabase';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

/**
 * Sends Supabase password recovery email using a server-built redirect URL
 * (must match Authentication → Redirect URLs). Verifies the email exists in
 * Supabase Auth (`auth.users`) via admin `generateLink` so OAuth-only and
 * email users are included—not only `pp_users` / `pp_user_profiles`.
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
  } | null;
  const raw = typeof body?.email === 'string' ? body.email.trim() : '';
  const email = raw.toLowerCase();

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
          'Set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY so we can verify your account before sending a reset link.',
      },
      { status: 503 },
    );
  }

  const origin = getPasswordResetOrigin(request).replace(/\/$/, '');
  const redirectTo = `${origin}/auth/reset`;

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
            'No account exists for this email address. Check spelling or create an account.',
          code: 'ACCOUNT_NOT_FOUND',
        },
        { status: 404 },
      );
    }
    return NextResponse.json(
      {
        error: genError.message?.trim() || 'Could not verify account.',
        code: 'LOOKUP_FAILED',
      },
      { status: 400 },
    );
  }

  if (!linkData?.user?.id) {
    return NextResponse.json(
      {
        error:
          'No account exists for this email address. Check spelling or create an account.',
        code: 'ACCOUNT_NOT_FOUND',
      },
      { status: 404 },
    );
  }

  const anon = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { error } = await anon.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    const msg = error.message?.trim() || 'Could not send reset email.';
    const lower = msg.toLowerCase();
    const hint =
      /redirect|url/i.test(lower)
        ? `Add this URL to Supabase → Authentication → URL Configuration → Redirect URLs: ${redirectTo}`
        : undefined;
    return NextResponse.json(
      {
        error: msg,
        code: 'RESET_EMAIL_FAILED',
        ...(hint ? { hint } : {}),
      },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
