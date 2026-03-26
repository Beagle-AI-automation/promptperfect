'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { validatePassword } from '@/lib/auth/validation';

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordValidation = validatePassword(password);
  const showPasswordHints = password.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!passwordValidation.isValid) {
      setError(passwordValidation.errors[0] ?? 'Invalid password');
      return;
    }
    setLoading(true);
    try {
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
        provider?: string;
        model?: string;
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
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-[#252525] bg-[#0A0A0A]/80 p-8 shadow-xl">
        <h1 className="font-heading text-2xl font-semibold text-[#E7E6D9]">
          Create your account
        </h1>
        <p className="mt-2 text-sm text-[#B0B0B0]">Free forever. No credit card required.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
              autoComplete="new-password"
            />
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
            disabled={loading || !passwordValidation.isValid}
            className="w-full rounded-lg bg-[#4552FF] py-3 text-sm font-semibold text-white transition hover:bg-[#5B6CFF] disabled:opacity-50"
          >
            {loading ? 'Creating account…' : 'Sign Up'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#B0B0B0]">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-[#4552FF] hover:underline">
            Log in →
          </Link>
        </p>
      </div>
    </div>
  );
}
