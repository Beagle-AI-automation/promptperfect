import { checkRateLimit } from '@/lib/auth/rateLimit'
import { jsonLoginSuccess } from '@/lib/auth/jsonLoginSuccess'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/client/supabase'

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

    return NextResponse.json(
      { error: 'Invalid email or password' },
      { status: 401 }
    )
  } catch {
    // swallow: JSON parse or validation error
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  }
}
