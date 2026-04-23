'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { claimGuestHistoryAfterAuth } from '@/lib/client/claimGuestHistory';

export default function AuthCallbackPage() {
  const router = useRouter();
  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    return createBrowserClient(url, key);
  }, []);

  useEffect(() => {
    if (!supabase) {
      router.replace('/login');
      return;
    }

    let cancelled = false;

    async function finish() {
      const client = supabase;
      if (!client) return;

      const search =
        typeof window !== 'undefined' ? window.location.search : '';
      const params = new URLSearchParams(search);
      const oauthErr =
        params.get('error_description')?.trim() ||
        params.get('error')?.trim();
      if (oauthErr) {
        router.replace(
          `/login?error=${encodeURIComponent(oauthErr)}`,
        );
        return;
      }

      const code = params.get('code');

      let {
        data: { session },
      } = await client.auth.getSession();

      if (!cancelled && !session?.user && code) {
        const exchanged = await client.auth.exchangeCodeForSession(code);
        if (!exchanged.error && exchanged.data.session) {
          session = exchanged.data.session;
        }
      }

      if (cancelled) return;

      const user = session?.user;
      if (user?.id && user.email) {
        localStorage.setItem(
          'pp_user',
          JSON.stringify({
            id: user.id,
            name:
              (user.user_metadata?.full_name as string | undefined) ??
              (user.user_metadata?.name as string | undefined) ??
              null,
            email: user.email ?? '',
            provider: 'gemini',
            model: 'gemini-2.0-flash',
          }),
        );
        await claimGuestHistoryAfterAuth(user.id);
        router.replace('/app');
        return;
      }

      router.replace('/login');
    }

    void finish();

    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

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
  );
}
