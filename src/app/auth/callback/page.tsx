'use client'

import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function AuthCallbackPage() {
  const router = useRouter()
  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) return null
    return createBrowserClient(url, key)
  }, [])

  useEffect(() => {
    if (!supabase) {
      router.push('/login')
      return
    }

    void (async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session?.user) {
        router.push('/login')
        return
      }

      const u = data.session.user
      const guestId =
        typeof window !== 'undefined'
          ? localStorage.getItem('pp_guest_id')?.trim()
          : ''

      if (guestId) {
        const { migrateGuestHistory } = await import('@/lib/client/userProfile')
        const { error } = await migrateGuestHistory(supabase, guestId)
        if (!error) {
          const { clearGuestSession } = await import('@/lib/guest')
          clearGuestSession()
        }
      }

      localStorage.setItem(
        'pp_user',
        JSON.stringify({
          id: u.id,
          name:
            (u.user_metadata?.full_name as string | undefined) ??
            (u.user_metadata?.name as string | undefined) ??
            null,
          email: u.email ?? '',
          provider: 'gemini',
          model: 'gemini-2.0-flash',
        }),
      )
      router.push('/app')
    })()
  }, [router, supabase])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#050505] px-4">
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-[#252525] bg-gradient-to-b from-white/[0.05] to-transparent px-10 py-12">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-[#252525] border-t-[#4552FF]"
          role="status"
          aria-label="Loading"
        />
        <div className="text-center">
          <p className="font-heading text-sm font-medium text-[#E7E6D9]">
            Authenticating
          </p>
          <p className="mt-1 text-xs text-[#71717A]">Please wait…</p>
        </div>
      </div>
    </div>
  )
}
