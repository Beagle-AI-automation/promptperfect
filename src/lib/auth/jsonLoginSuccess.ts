import type { Session, User } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { getSupabaseAdminClient } from '@/lib/client/supabase'

type AdminClient = NonNullable<ReturnType<typeof getSupabaseAdminClient>>

/**
 * After Supabase password sign-in succeeds: ensure the app users row exists and return API JSON.
 */
export async function jsonLoginSuccess(
  admin: AdminClient,
  authPayload: { session: Session; user: User },
  emailNormalized: string,
  emailRawTrim: string,
) {
  const { session, user: authUser } = authPayload
  const emailForRow = emailRawTrim || emailNormalized

  let { data: row } = await admin
    .from('pp_users')
    .select('id, name, email, provider, model')
    .eq('id', authUser.id)
    .maybeSingle()

  if (!row) {
    const { data: byEmail } = await admin
      .from('pp_users')
      .select('id, name, email, provider, model')
      .eq('email', emailNormalized)
      .maybeSingle()
    if (byEmail) {
      row = byEmail
    } else {
      await admin.from('pp_users').insert({
        id: authUser.id,
        name: null,
        email: emailForRow,
        password_hash: 'supabase_auth',
        provider: 'gemini',
        model: 'gemini-2.0-flash',
        api_key: '',
      })
      const { data: inserted } = await admin
        .from('pp_users')
        .select('id, name, email, provider, model')
        .eq('id', authUser.id)
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
    user: row,
    session: {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    },
  })
}
