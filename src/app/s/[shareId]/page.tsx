import { getServiceClient } from '@/lib/server/supabase';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { CopyButton } from '@/components/CopyButton';

interface SharedOptimization {
  id: string;
  prompt_original: string;
  prompt_optimized: string;
  mode: string;
  explanation: string;
  created_at: string;
}

const MODE_META: Record<string, { label: string; color: string }> = {
  better:    { label: 'Better',          color: 'bg-violet-500/10 text-violet-300 ring-violet-500/20' },
  specific:  { label: 'More Specific',   color: 'bg-blue-500/10 text-blue-300 ring-blue-500/20' },
  cot:       { label: 'Chain-of-Thought',color: 'bg-amber-500/10 text-amber-300 ring-amber-500/20' },
  developer: { label: 'Developer',       color: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/20' },
  research:  { label: 'Research',        color: 'bg-cyan-500/10 text-cyan-300 ring-cyan-500/20' },
  beginner:  { label: 'Beginner',        color: 'bg-pink-500/10 text-pink-300 ring-pink-500/20' },
  product:   { label: 'Product',         color: 'bg-orange-500/10 text-orange-300 ring-orange-500/20' },
  marketing: { label: 'Marketing',       color: 'bg-rose-500/10 text-rose-300 ring-rose-500/20' },
};

function getModeMeta(mode: string) {
  return MODE_META[mode] ?? { label: mode, color: 'bg-accent/10 text-[#7b87ff] ring-accent/20' };
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function ErrorPage({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#050505] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-[#252525] bg-gradient-to-b from-white/[0.05] to-transparent p-10 text-center shadow-2xl">
        <div className="mb-4 mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#252525] bg-[#0A0A0A]">
          <Sparkles className="h-5 w-5 text-accent-text" />
        </div>
        <h1 className="font-heading text-xl font-semibold text-[#E7E6D9]">{title}</h1>
        <p className="mt-2 text-sm text-[#888]">{body}</p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Try PromptPerfect <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

export default async function SharedOptimizationPage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = await params;
  const client = getServiceClient();

  if (!client) {
    return <ErrorPage title="Service Unavailable" body="Unable to connect to the database." />;
  }

  const { data, error } = await client
    .from('pp_optimization_history')
    .select('id, prompt_original, prompt_optimized, mode, explanation, created_at')
    .eq('share_id', shareId)
    .single();

  if (error || !data) {
    return (
      <ErrorPage
        title="Not Found"
        body="This shared optimization doesn't exist or has been removed."
      />
    );
  }

  const opt = data as SharedOptimization;
  const { label: modeLabel, color: modeColor } = getModeMeta(opt.mode);
  const dateStr = formatDate(opt.created_at);

  return (
    <div className="min-h-screen bg-[#050505] font-sans text-[#E7E6D9] antialiased">

      {/* ── Header ── */}
      <header className="sticky top-0 z-20 border-b border-[#1a1a1a] bg-[#050505]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-heading text-[15px] font-bold tracking-tight text-[#E7E6D9] transition hover:opacity-80">
              PromptPerfect
            </Link>
            <span className="hidden h-4 w-px bg-[#2a2a2a] sm:block" />
            <span className="hidden text-xs text-[#555] sm:block">Shared Optimization</span>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90"
          >
            Try it free <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="mx-auto max-w-5xl px-5 pb-24 pt-10 sm:px-8">

        {/* Meta row */}
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ${modeColor}`}>
            {modeLabel}
          </span>
          {dateStr && (
            <span className="text-xs text-[#555]">{dateStr}</span>
          )}
        </div>

        {/* Prompt cards */}
        <div className="grid gap-5 lg:grid-cols-2">

          {/* Original */}
          <div className="flex flex-col rounded-2xl border border-[#1e1e1e] bg-gradient-to-b from-white/[0.04] to-transparent">
            <div className="flex items-center border-b border-[#1a1a1a] px-5 py-3.5">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-[#555]">Original</span>
            </div>
            <div className="flex-1 px-5 py-5">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#B0B0B0]">
                {opt.prompt_original}
              </p>
            </div>
          </div>

          {/* Optimized */}
          <div className="flex flex-col rounded-2xl border border-accent/25 bg-gradient-to-b from-[#4552FF]/[0.06] to-transparent shadow-[0_0_40px_-12px_rgba(69,82,255,0.25)]">
            <div className="flex items-center justify-between border-b border-accent/15 px-5 py-3.5">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-[#7b87ff]">Optimized</span>
              <CopyButton text={opt.prompt_optimized} label="Copy" />
            </div>
            <div className="flex-1 px-5 py-5">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#E7E6D9]">
                {opt.prompt_optimized}
              </p>
            </div>
          </div>
        </div>

        {/* Explanation */}
        {opt.explanation && (
          <div className="mt-5 rounded-2xl border border-[#1e1e1e] bg-gradient-to-b from-white/[0.03] to-transparent px-5 py-5">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-[#555]">What changed</p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#888]">
              {opt.explanation}
            </p>
          </div>
        )}

        {/* CTA */}
        <div className="mt-10 overflow-hidden rounded-2xl border border-accent/20 bg-gradient-to-br from-[#4552FF]/10 via-[#050505] to-[#050505] px-8 py-10 text-center">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-accent/20 bg-accent/10">
            <Sparkles className="h-4 w-4 text-[#7b87ff]" />
          </div>
          <h2 className="font-heading text-xl font-semibold text-[#E7E6D9]">
            Optimize your own prompts
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-[#888]">
            Free to start. No credit card required. Make your AI prompts dramatically more effective in seconds.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Create free account <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/app"
              className="inline-flex items-center gap-2 rounded-lg border border-[#2a2a2a] px-6 py-2.5 text-sm font-medium text-[#B0B0B0] transition hover:border-[#3a3a3a] hover:text-[#E7E6D9]"
            >
              Try without signing up
            </Link>
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-[#1a1a1a]">
        <div className="mx-auto max-w-5xl px-5 py-5 text-center text-xs text-[#444] sm:px-8">
          Powered by <Link href="/" className="text-[#555] transition hover:text-[#888]">PromptPerfect</Link>
        </div>
      </footer>
    </div>
  );
}
