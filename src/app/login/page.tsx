'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { validatePassword } from '@/lib/auth/validation';

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="currentColor"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="currentColor"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="currentColor"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    return createBrowserClient(url, key);
  }, []);

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordValidation = validatePassword(password);
  const showPasswordHints = mode === 'signup' && password.length > 0;

  async function handleGoogle() {
    if (!supabase) {
      setError('Google sign-in is not available');
      return;
    }
    setError('');
    const { error: oAuthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (oAuthError) setError(oAuthError.message);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'signup') {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim() || undefined,
            email: email.trim(),
            password,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Sign up failed');
          return;
        }
        const user = data.user as {
          id: string;
          name: string | null;
          email: string;
          provider: string;
          model: string;
        };
        localStorage.setItem(
          'pp_user',
          JSON.stringify({
            id: user.id,
            name: user.name,
            email: user.email,
            provider: user.provider ?? 'gemini',
            model: user.model ?? 'gemini-2.0-flash',
          })
        );
        router.push('/control-room');
        return;
      }

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Invalid email or password');
        return;
      }
      if (
        supabase &&
        data.session &&
        typeof data.session.access_token === 'string' &&
        typeof data.session.refresh_token === 'string'
      ) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }
      const user = data.user as {
        id: string;
        name: string | null;
        email: string;
        provider: string;
        model: string;
      };
      localStorage.setItem(
        'pp_user',
        JSON.stringify({
          id: user.id,
          name: user.name,
          email: user.email,
          provider: user.provider,
          model: user.model,
        })
      );
      router.push('/app');
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-[#252525] bg-[#0A0A0A]/80 p-8 shadow-xl">
        <div className="flex gap-2 rounded-lg border border-[#252525] p-1">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setError('');
            }}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
              mode === 'signin'
                ? 'bg-[#4552FF] text-white'
                : 'text-[#B0B0B0] hover:text-[#E7E6D9]'
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError('');
            }}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
              mode === 'signup'
                ? 'bg-[#4552FF] text-white'
                : 'text-[#B0B0B0] hover:text-[#E7E6D9]'
            }`}
          >
            Sign up
          </button>
        </div>

        <h1 className="mt-6 font-heading text-2xl font-semibold text-[#E7E6D9]">
          {mode === 'signin' ? 'Welcome back' : 'Create your account'}
        </h1>

        {mode === 'signin' && (
          <>
            <button
              type="button"
              onClick={handleGoogle}
              disabled={!supabase}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-[#252525] bg-[#0A0A0A] py-3 text-sm font-medium text-[#E7E6D9] transition hover:border-[#4552FF] disabled:opacity-50"
            >
              <GoogleIcon />
              Continue with Google
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#252525]" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#0A0A0A]/80 px-2 text-[#B0B0B0]">or</span>
              </div>
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-[#E7E6D9]">
                Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#252525] bg-[#0A0A0A] p-3 text-[#E7E6D9] placeholder-[#71717A] focus:border-[#4552FF] focus:outline-none"
                placeholder="Your name"
                autoComplete="name"
              />
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#E7E6D9]">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-[#252525] bg-[#0A0A0A] p-3 text-[#E7E6D9] placeholder-[#71717A] focus:border-[#4552FF] focus:outline-none"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[#E7E6D9]">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-[#252525] bg-[#0A0A0A] p-3 text-[#E7E6D9] placeholder-[#71717A] focus:border-[#4552FF] focus:outline-none"
              placeholder="••••••••"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
            {mode === 'signin' && (
              <div className="mt-1 w-full text-right">
                <Link
                  href="/forgot-password"
                  className="text-sm text-[#B0B0B0] hover:text-[#ECECEC]"
                >
                  Forgot password?
                </Link>
              </div>
            )}
            {showPasswordHints && (
              <div className="mt-2 space-y-1">
                {passwordValidation.errors.map((err) => (
                  <p key={err} className="text-sm text-red-400">
                    {err}
                  </p>
                ))}
                {passwordValidation.isValid && (
                  <p className="text-sm text-green-500">✓ Password meets all requirements</p>
                )}
              </div>
            )}
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading || (mode === 'signup' && !passwordValidation.isValid)}
            className="w-full rounded-lg bg-[#4552FF] py-3 text-sm font-semibold text-white transition hover:bg-[#5B6CFF] disabled:opacity-50"
          >
            {loading
              ? mode === 'signup'
                ? 'Creating account…'
                : 'Signing in…'
              : mode === 'signup'
                ? 'Sign Up'
                : 'Log In'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#B0B0B0]">
          {mode === 'signin' ? (
            <>
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="font-medium text-[#4552FF] hover:underline"
              >
                Sign up →
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('signin')}
                className="font-medium text-[#4552FF] hover:underline"
              >
                Log in →
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
