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
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        const u = data.session.user
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
          })
        )
        router.push('/app')
      } else {
        router.push('/login')
      }
    })
  }, [router, supabase])

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-6 h-6 border-2 border-[#4552FF] border-t-transparent
                          rounded-full animate-spin"
        />
        <p className="text-[#B0B0B0] text-sm">Authenticating...</p>
      </div>
    </div>
  )
}
