import { checkRateLimit } from '@/lib/auth/rateLimit'
import { createClient, type Session, type User } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/client/supabase'

/** Narrow Supabase rows — generated DB types may resolve to `GenericStringError` when tables are absent from typings. */
type PpUserRowApiKey = {
  id: string
  name: string | null
  email: string | null
  provider: string | null
  model: string | null
  api_key: string | null
}

type PpUserRowPassword = {
  id: string
  name: string | null
  email: string | null
  password_hash: string | null
  provider: string | null
  model: string | null
}

/** Shared success path after `signInWithPassword` returns a session. */
async function jsonLoginSuccess(
  admin: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  authData: { session: Session; user: User },
  email: string,
  emailRawTrim: string,
) {
  const authId = authData.user.id

  if (!authData.user.email_confirmed_at) {
    return NextResponse.json(
      {
        error:
          'Please confirm your email before signing in. Check your inbox for the message from PromptPerfect.',
        code: 'EMAIL_NOT_CONFIRMED',
        hint: 'Use “Resend confirmation email” below if you did not receive it (check spam).',
      },
      { status: 403 },
    )
  }

  let { data: row } = await admin
    .from('pp_users')
    .select('id, name, email, provider, model, api_key')
    .eq('id', authId)
    .maybeSingle()

  if (!row) {
    const { data: rawByEmail } = await findPpUserByEmail(
      admin,
      email,
      emailRawTrim,
      'id, name, email, provider, model, api_key',
    )
    const byEmail = rawByEmail as PpUserRowApiKey | null

    if (byEmail) {
      if (byEmail.id !== authId) {
        await admin.from('pp_users').delete().eq('id', byEmail.id)
        const { error: migrateErr } = await admin.from('pp_users').insert({
          id: authId,
          name: byEmail.name,
          email: byEmail.email,
          password_hash: 'supabase_auth',
          provider: byEmail.provider ?? 'gemini',
          model: byEmail.model ?? 'gemini-2.0-flash',
          api_key: typeof byEmail.api_key === 'string' ? byEmail.api_key : '',
        })
        if (migrateErr) {
          console.error('[login] pp_users id sync', migrateErr)
          return NextResponse.json(
            {
              error:
                'Could not sync your account. Try again or contact support.',
            },
            { status: 500 },
          )
        }
        row = {
          id: authId,
          name: byEmail.name,
          email: byEmail.email,
          provider: byEmail.provider,
          model: byEmail.model,
          api_key:
            typeof byEmail.api_key === 'string' ? byEmail.api_key : '',
        }
      } else {
        row = byEmail
      }
    } else {
      await admin.from('pp_users').insert({
        id: authId,
        name: null,
        email,
        password_hash: 'supabase_auth',
        provider: 'gemini',
        model: 'gemini-2.0-flash',
        api_key: '',
      })
      const { data: inserted } = await admin
        .from('pp_users')
        .select('id, name, email, provider, model, api_key')
        .eq('id', authId)
        .maybeSingle()
      row = inserted
    }
  }

  if (!row) {
    return NextResponse.json(
      { error: 'Invalid email or password' },
      { status: 401 },
    )
  }

  return NextResponse.json({
    user: {
      id: authId,
      name: row.name,
      email: row.email,
      provider: row.provider,
      model: row.model,
    },
    session: {
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
    },
  })
}

async function sha256Hex(text: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Match legacy rows stored with mixed-case emails; prefer normalized lowercase. */
async function findPpUserByEmail(
  admin: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  normalizedEmail: string,
  rawTrimmed: string,
  columns: string,
) {
  let row = await admin
    .from('pp_users')
    .select(columns)
    .eq('email', normalizedEmail)
    .maybeSingle()
  if (row.data || row.error) return row
  if (rawTrimmed && rawTrimmed !== normalizedEmail) {
    row = await admin
      .from('pp_users')
      .select(columns)
      .eq('email', rawTrimmed)
      .maybeSingle()
  }
  return row
}

export async function POST(request: Request) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many attempts. Please wait a minute.' },
      { status: 429 }
    )
  }

  try {
    const body = await request.json()
    const emailRawTrim =
      typeof body.email === 'string' ? body.email.trim() : ''
    const email = emailRawTrim.toLowerCase()
    const password = typeof body.password === 'string' ? body.password : ''

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
    if (!url || !anonKey) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      )
    }

    const supabaseAuth = createClient(url, anonKey)
    const { data: authData, error: authError } =
      await supabaseAuth.auth.signInWithPassword({
        email,
        password,
      })

    if (authError) {
      const ec = authError.code?.toLowerCase() ?? ''
      const em = authError.message?.toLowerCase() ?? ''
      if (
        ec === 'email_not_confirmed' ||
        ec === 'email_notconfirmed' ||
        (em.includes('email') && em.includes('confirm')) ||
        em.includes('email not confirmed')
      ) {
        return NextResponse.json(
          {
            error:
              'Please confirm your email before signing in. Check your inbox for the link we sent.',
            code: 'EMAIL_NOT_CONFIRMED',
            hint:
              'If you did not receive it, use “Resend confirmation email” below after entering your email.',
          },
          { status: 403 },
        )
      }
    }

    if (!authError && authData.session && authData.user) {
      const admin = getSupabaseAdminClient()
      if (!admin) {
        return NextResponse.json(
          { error: 'Database not configured' },
          { status: 503 }
        )
      }
      return jsonLoginSuccess(
        admin,
        { session: authData.session, user: authData.user },
        email,
        emailRawTrim,
      )
    }

    const admin = getSupabaseAdminClient()
    if (!admin) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      )
    }

    const { data: rawUser, error } = await findPpUserByEmail(
      admin,
      email,
      emailRawTrim,
      'id, name, email, password_hash, provider, model',
    )
    const user = rawUser as PpUserRowPassword | null

    if (error || !user) {
      return NextResponse.json(
        {
          error:
            authError?.message?.trim() || 'Invalid email or password',
        },
        { status: 401 },
      )
    }

    // Password lives in Supabase Auth only — never use the legacy SHA-256 branch here.
    if (user.password_hash === 'supabase_auth') {
      const msg =
        authError?.message?.trim() || 'Invalid email or password'
      const hint =
        /confirm|verified|verification/i.test(msg)
          ? 'Confirm the email PromptPerfect sent, then try again — or use Forgot password.'
          : undefined
      return NextResponse.json(
        { error: msg, ...(hint ? { hint } : {}) },
        { status: 401 },
      )
    }

    const inputHash = await sha256Hex(password)
    if (inputHash !== user.password_hash) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        provider: user.provider,
        model: user.model,
      },
    })
  } catch {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  }
}
