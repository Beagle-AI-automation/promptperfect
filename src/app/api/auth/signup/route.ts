import { validatePassword, validateEmail } from '@/lib/auth/validation'
import { checkRateLimit, rateLimitKey } from '@/lib/auth/rateLimit'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import {
  getSupabaseUrl,
  normalizeEnvValue,
} from '@/lib/server/supabase'
import { getSiteOriginForAuth } from '@/lib/auth/oauthRedirect'
import { logWarn } from '@/lib/logger'

function getServiceSupabase() {
  const url = getSupabaseUrl()
  const key =
    normalizeEnvValue(process.env.SUPABASE_SERVICE_KEY) ||
    normalizeEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY)
  if (!url || !key) return null
  return createClient(url, key)
}

function looksLikeDuplicateAuthError(message: string): boolean {
  return /already\s*registered|already\s*exists|user\s*already|duplicate|unique/i.test(
    message,
  )
}

export async function POST(request: Request) {
  if (!checkRateLimit(rateLimitKey('auth/signup', request))) {
    return NextResponse.json(
      { error: 'Too many attempts. Please wait a minute.' },
      { status: 429 },
    )
  }

  const body = (await request.json().catch(() => null)) as {
    email?: string;
    password?: string;
    name?: string;
  } | null;
  if (!body) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  const email =
    typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const name = typeof body.name === 'string' ? body.name.trim() : ''

  if (!validateEmail(email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
  }
  const validation = validatePassword(password)
  if (!validation.isValid) {
    return NextResponse.json({ error: validation.errors[0] }, { status: 400 })
  }

  const supabase = getServiceSupabase()
  // getSupabaseUrl() is null for missing *and* placeholder URLs, so local
  // dev without a backend fails fast here instead of hanging on a dead domain.
  const url = getSupabaseUrl()
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

  if (!supabase || !url || !anonKey) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  // Anon client used for signUp (triggers confirmation email) and resend.
  const anon = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Redirect destination embedded in the confirmation email link.
  const emailRedirectTo = `${getSiteOriginForAuth(request)}/auth/callback`

  // Pre-flight: check pp_users table for an existing row with this email.
  const { data: existingRow } = await supabase
    .from('pp_users')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (existingRow) {
    return NextResponse.json(
      {
        error:
          'An account with this email already exists. Try signing in instead.',
      },
      { status: 409 },
    )
  }

  let uid: string | undefined
  // Track whether signUp already triggered a confirmation email so we don't
  // double-send when falling through to resend() below.
  let verificationEmailSent = false

  // --- Primary path: admin.createUser (no email sent by Supabase admin API) ---
  const adminResult = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: false,   // Do NOT auto-confirm — we send the email ourselves
    user_metadata: {
      name: name || undefined,
      full_name: name || undefined,
    },
  })

  if (!adminResult.error && adminResult.data.user) {
    uid = adminResult.data.user.id
  } else {
    const adminMsg = adminResult.error?.message ?? ''
    if (looksLikeDuplicateAuthError(adminMsg)) {
      return NextResponse.json(
        {
          error:
            'An account with this email already exists. Try signing in instead.',
        },
        { status: 409 },
      )
    }

    // --- Fallback path: anon signUp (Supabase sends confirmation email automatically) ---
    const signUpRes = await anon.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
        data: {
          name: name || undefined,
          full_name: name || undefined,
        },
      },
    })

    if (signUpRes.error) {
      const sm = signUpRes.error.message ?? ''
      if (looksLikeDuplicateAuthError(sm)) {
        return NextResponse.json(
          {
            error:
              'An account with this email already exists. Try signing in instead.',
          },
          { status: 409 },
        )
      }
      logWarn('signup', `signUp fallback failed: ${adminMsg || sm}`)
      return NextResponse.json(
        { error: 'Sign up failed. Please try again.' },
        { status: 400 },
      )
    }

    if (!signUpRes.data.user) {
      return NextResponse.json({ error: 'Sign up failed' }, { status: 500 })
    }

    uid = signUpRes.data.user.id
    verificationEmailSent = true   // signUp already sent the confirmation email
  }

  if (!uid) {
    return NextResponse.json({ error: 'Sign up failed' }, { status: 500 })
  }

  // Insert app-level user row (FK to auth.users).
  const { error: insertErr } = await supabase.from('pp_users').insert({
    id: uid,
    name: name || null,
    email,
    password_hash: 'supabase_auth',
    provider: 'gemini',
    model: 'gemini-2.0-flash',
    api_key: '',
  })
  if (insertErr && insertErr.code !== '23505') {
    logWarn('signup', `insert pp_users failed: ${insertErr.message}`)
    return NextResponse.json(
      { error: 'Could not create profile' },
      { status: 500 },
    )
  }

  // For the admin-path: admin.createUser does NOT send an email, so we trigger
  // the confirmation email explicitly via resend().
  if (!verificationEmailSent) {
    const { error: resendErr } = await anon.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo },
    })
    if (resendErr) {
      // Non-fatal: account exists, verification email just couldn't be sent.
      logWarn('signup', `resend verification email failed: ${resendErr.message}`)
    }
  }

  return NextResponse.json({ verificationRequired: true, email })
}
