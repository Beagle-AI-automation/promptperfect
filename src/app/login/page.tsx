'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { validatePassword } from '@/lib/auth/validation';
import { AuthDivider } from '@/components/auth/AuthDivider';
import { AuthShell } from '@/components/auth/AuthShell';
import { GoogleIcon } from '@/components/auth/GoogleIcon';
import {
  authGoogleBtnClass,
  authInputClass,
  authLabelClass,
  authPrimaryBtnClass,
} from '@/components/auth/auth-styles';

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
    <AuthShell>
      <div className="flex gap-1.5 rounded-xl border border-[#252525] bg-[#050505]/60 p-1">
        <button
          type="button"
          onClick={() => {
            setMode('signin');
            setError('');
          }}
          className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition ${
            mode === 'signin'
              ? 'bg-[#4552FF] text-white shadow-md shadow-[#4552FF]/25'
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
          className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition ${
            mode === 'signup'
              ? 'bg-[#4552FF] text-white shadow-md shadow-[#4552FF]/25'
              : 'text-[#B0B0B0] hover:text-[#E7E6D9]'
          }`}
        >
          Sign up
        </button>
      </div>

      <h1 className="mt-8 font-heading text-2xl font-semibold tracking-tight text-[#E7E6D9]">
        {mode === 'signin' ? 'Welcome back' : 'Create your account'}
      </h1>
      <p className="mt-1.5 text-sm text-[#B0B0B0]">
        {mode === 'signin'
          ? 'Sign in to continue to PromptPerfect.'
          : 'Start optimizing prompts in minutes.'}
      </p>

      <button
        type="button"
        onClick={handleGoogle}
        disabled={!supabase}
        className={`${authGoogleBtnClass} mt-6`}
      >
        <GoogleIcon />
        Continue with Google
      </button>

      <div className="my-6">
        <AuthDivider />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'signup' && (
          <div>
            <label htmlFor="name" className={authLabelClass}>
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={authInputClass}
              placeholder="Your name"
              autoComplete="name"
            />
          </div>
        )}
        <div>
          <label htmlFor="email" className={authLabelClass}>
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={authInputClass}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>
        <div>
          <label htmlFor="password" className={authLabelClass}>
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={authInputClass}
            placeholder="••••••••"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          />
          {mode === 'signin' && (
            <div className="mt-2 flex justify-end">
              <Link
                href="/forgot-password"
                className="text-sm text-[#B0B0B0] transition hover:text-[#E7E6D9]"
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
                <p className="text-sm text-emerald-400/90">
                  ✓ Password meets all requirements
                </p>
              )}
            </div>
          )}
        </div>
        {error && (
          <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading || (mode === 'signup' && !passwordValidation.isValid)}
          className={authPrimaryBtnClass}
        >
          {loading
            ? mode === 'signup'
              ? 'Creating account…'
              : 'Signing in…'
            : mode === 'signup'
              ? 'Sign up'
              : 'Log in'}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-[#B0B0B0]">
        {mode === 'signin' ? (
          <>
            Don&apos;t have an account?{' '}
            <button
              type="button"
              onClick={() => setMode('signup')}
              className="font-medium text-[#4552FF] transition hover:text-[#6b75ff]"
            >
              Sign up
            </button>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => setMode('signin')}
              className="font-medium text-[#4552FF] transition hover:text-[#6b75ff]"
            >
              Log in
            </button>
          </>
        )}
      </p>

      <div className="mt-6 border-t border-[#1a1a1a] pt-6 text-center">
        <Link
          href="/app"
          className="text-sm text-[#71717A] transition hover:text-[#B0B0B0]"
        >
          Continue as guest — 5 free optimizations, no sign up
        </Link>
      </div>
    </AuthShell>
  );
}
