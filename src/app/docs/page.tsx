import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'API Docs — PromptPerfect by Beagle',
  description: 'Use the PromptPerfect optimization API from your own applications.',
};

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-[#050505] px-4 py-12 text-[#ECECEC] sm:px-6 md:px-8">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm text-[#4552FF]">
          <Link href="/" className="font-medium hover:underline">
            ← Back to home
          </Link>
        </p>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">API</h1>
        <p className="mt-3 text-zinc-400">
          Send a draft prompt and mode to the optimizer endpoint. Use the same deployment URL as
          your web app (for example <code className="text-zinc-300">/api/optimize</code>).
        </p>

        <h2 className="mt-10 text-lg font-semibold text-[#ECECEC]">Example request</h2>
        <pre className="mt-4 overflow-x-auto rounded-lg border border-zinc-700 bg-[#0a0a0a] p-4 text-left text-sm leading-relaxed text-zinc-300">
          <code>{`curl -X POST https://your-app.example/api/optimize \\
  -H "Content-Type: application/json" \\
  -d '{"prompt":"Summarize this article","mode":"better"}'`}</code>
        </pre>

        <p className="mt-8 text-sm text-zinc-500">
          For streaming and auth-specific options, see your deployment&apos;s environment variables
          and route handlers under <code className="text-zinc-400">src/app/api/</code>.
        </p>
      </div>
    </main>
  );
}
