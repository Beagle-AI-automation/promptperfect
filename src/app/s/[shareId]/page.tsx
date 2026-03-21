import { getSupabaseClient } from '@/lib/supabase';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { CopyButton } from '@/components/CopyButton';

interface SharedOptimization {
  id: string;
  prompt_original: string;
  prompt_optimized: string;
  mode: string;
  explanation: string;
  created_at: string;
}

export default async function SharedOptimizationPage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = await params;

  const client = getSupabaseClient();
  
  if (!client) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 px-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-8 text-center backdrop-blur">
          <h1 className="text-2xl font-bold text-zinc-100">Service Unavailable</h1>
          <p className="mt-2 text-zinc-400">Unable to connect to database</p>
        </div>
      </div>
    );
  }

  const { data, error } = await client
    .from('pp_optimization_history')
    .select('id, prompt_original, prompt_optimized, mode, explanation, created_at')
    .eq('share_id', shareId)
    .single();

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 px-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-8 text-center backdrop-blur">
          <h1 className="text-2xl font-bold text-zinc-100">Not Found</h1>
          <p className="mt-2 text-zinc-400">This shared optimization does not exist or has been removed.</p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-3 font-semibold text-white transition-opacity hover:opacity-90"
          >
            Try PromptPerfect
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  const optimization = data as SharedOptimization;
  const modeLabel = getModeLabel(optimization.mode);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-zinc-100">PromptPerfect</h1>
              <p className="mt-1 text-sm text-zinc-400">Shared Optimization</p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800"
            >
              Try PromptPerfect
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Mode Badge */}
        <div className="mb-6 flex items-center gap-3">
          <span className="inline-flex items-center rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-sm font-medium text-blue-400">
            {modeLabel}
          </span>
          <span className="text-sm text-zinc-500">
            {new Date(optimization.created_at).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
        </div>

        {/* Prompts Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Original Prompt */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-6 backdrop-blur">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-100">Original Prompt</h2>
            </div>
            <div className="rounded-lg bg-zinc-900/50 p-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
                {optimization.prompt_original}
              </p>
            </div>
          </div>

          {/* Optimized Prompt */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-6 backdrop-blur">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-100">Optimized Prompt</h2>
              <CopyButton text={optimization.prompt_optimized} />
            </div>
            <div className="rounded-lg bg-zinc-900/50 p-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
                {optimization.prompt_optimized}
              </p>
            </div>
          </div>
        </div>

        {/* Explanation */}
        {optimization.explanation && (
          <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-6 backdrop-blur">
            <h2 className="mb-4 text-lg font-semibold text-zinc-100">Explanation</h2>
            <div className="prose prose-invert prose-sm max-w-none">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-400">
                {optimization.explanation}
              </p>
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="mt-8 rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-purple-500/10 p-8 text-center backdrop-blur">
          <h3 className="text-xl font-bold text-zinc-100">Want to optimize your own prompts?</h3>
          <p className="mt-2 text-zinc-400">
            Try PromptPerfect to make your prompts more effective with AI-powered optimization.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-8 py-3 text-base font-semibold text-white transition-opacity hover:opacity-90"
          >
            Get Started
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 bg-zinc-950/50 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-6 text-center text-sm text-zinc-500 sm:px-6 lg:px-8">
          <p>Powered by PromptPerfect</p>
        </div>
      </footer>
    </div>
  );
}

function getModeLabel(mode: string): string {
  const labels: Record<string, string> = {
    better: 'Better',
    specific: 'More Specific',
    cot: 'Chain-of-Thought',
    developer: 'Developer',
    research: 'Research',
    beginner: 'Beginner',
    product: 'Product',
    marketing: 'Marketing',
  };
  return labels[mode] || mode;
}
