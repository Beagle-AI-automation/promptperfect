'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

async function sha256Hex(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const password_hash = await sha256Hex(password);
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() || undefined, email: email.trim(), password_hash }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Sign up failed');
        return;
      }
      const user = data.user as { id: string; name: string | null; email: string; provider: string; model: string };
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
      router.push('/control-room');
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/80 p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-[#ECECEC]">Create your account</h1>
        <p className="mt-2 text-sm text-zinc-400">Free forever. No credit card required.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-zinc-300">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2.5 text-[#ECECEC] placeholder-zinc-500 focus:border-[#4552FF] focus:outline-none focus:ring-1 focus:ring-[#4552FF]"
              placeholder="Your name"
              autoComplete="name"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-zinc-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2.5 text-[#ECECEC] placeholder-zinc-500 focus:border-[#4552FF] focus:outline-none focus:ring-1 focus:ring-[#4552FF]"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-zinc-300">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2.5 text-[#ECECEC] placeholder-zinc-500 focus:border-[#4552FF] focus:outline-none focus:ring-1 focus:ring-[#4552FF]"
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>
          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#4552FF] py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Creating account…' : 'Sign Up'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-400">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-[#4552FF] hover:underline">
            Log in →
          </Link>
        </p>
      </div>
    </div>
  );
}
