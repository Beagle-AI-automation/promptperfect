import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Documentation — PromptPerfect by Beagle',
  description: 'Chrome extension setup and API usage for PromptPerfect.',
};

export default function DocsPage() {
  return (
    <div className="bg-background text-foreground min-h-screen font-sans">
      <header className="border-b border-zinc-800 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <Link
            href="/"
            className="text-sm font-semibold text-[#ECECEC] hover:text-[#4552FF]"
          >
            ← PromptPerfect
          </Link>
          <a
            href="https://beaglecorp.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#4552FF] hover:underline"
          >
            Beagle
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight text-[#ECECEC]">Documentation</h1>
        <p className="mt-3 text-zinc-400">
          Quick reference for the Chrome extension and HTTP API.
        </p>

        <section id="chrome-extension" className="mt-12 scroll-mt-20">
          <h2 className="text-xl font-semibold text-[#ECECEC]">Chrome extension</h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            The extension lives in the <code className="rounded bg-zinc-900 px-1.5 py-0.5 text-zinc-200">extension/</code>{' '}
            folder in the repo. Until a Chrome Web Store listing is published, install locally:
          </p>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-zinc-300">
            <li>Open Chrome → <code className="text-zinc-200">chrome://extensions</code></li>
            <li>Enable <strong className="text-[#ECECEC]">Developer mode</strong></li>
            <li>Click <strong className="text-[#ECECEC]">Load unpacked</strong> and select the{' '}
              <code className="rounded bg-zinc-900 px-1.5 py-0.5">extension/</code> directory</li>
            <li>
              In the extension popup, set <strong className="text-[#ECECEC]">API URL</strong> to your
              deployed app (e.g. <code className="rounded bg-zinc-900 px-1.5 py-0.5">https://…</code>)
              or <code className="rounded bg-zinc-900 px-1.5 py-0.5">http://localhost:3000</code> for
              local dev
            </li>
          </ol>
        </section>

        <section id="api" className="mt-12 scroll-mt-20">
          <h2 className="text-xl font-semibold text-[#ECECEC]">API</h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            <code className="rounded bg-zinc-900 px-1.5 py-0.5 text-zinc-200">POST /api/optimize</code>{' '}
            accepts JSON and returns a streamed text response (same pipeline as the web app). Typical
            body:
          </p>
          <pre className="mt-4 overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-left text-xs leading-relaxed text-zinc-300">
            <code>{`{
  "text": "Your draft prompt…",
  "mode": "better",
  "apiKey": "optional-gemini-key",
  "session_id": "optional-uuid-for-analytics"
}`}</code>
          </pre>
          <p className="mt-4 text-sm text-zinc-400">
            Valid <code className="rounded bg-zinc-900 px-1 py-0.5">mode</code> values match{' '}
            <code className="rounded bg-zinc-900 px-1 py-0.5">OptimizationMode</code> in{' '}
            <code className="rounded bg-zinc-900 px-1 py-0.5">src/lib/types.ts</code> (e.g.{' '}
            <code className="rounded bg-zinc-900 px-1 py-0.5">better</code>,{' '}
            <code className="rounded bg-zinc-900 px-1 py-0.5">specific</code>,{' '}
            <code className="rounded bg-zinc-900 px-1 py-0.5">cot</code>). For a non-streaming JSON
            response, use <code className="rounded bg-zinc-900 px-1 py-0.5">POST /api/optimize-sync</code>.
          </p>
        </section>
      </main>
    </div>
  );
}
