'use client';

import {
  Clipboard,
  Code2,
  ExternalLink,
  Globe,
  Puzzle,
  Sparkles,
  Wand2,
} from 'lucide-react';
import Link from 'next/link';

import { LandingHeader } from '@/components/LandingHeader';
import { EXTENSION_README_URL } from '@/lib/site';

const apiSnippet = `const res = await fetch('/api/optimize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: 'Your draft prompt…',
    mode: 'better',
  }),
});
// Response is a streamed text body (see docs).`;

const steps = [
  {
    icon: Clipboard,
    label: 'Paste Prompt',
  },
  {
    icon: Wand2,
    label: 'Optimize',
  },
  {
    icon: Sparkles,
    label: 'Learn Why',
  },
];

export function LandingPageClient() {
  return (
    <main className="bg-background text-foreground flex min-h-screen min-w-0 flex-col overflow-x-hidden font-sans">
      <LandingHeader />

      <div className="mx-auto w-full min-w-0 max-w-5xl flex-1 px-3 py-12 sm:px-6 sm:py-16 md:px-8 lg:px-10">
        <section className="mb-16 min-w-0 text-center sm:mb-20 md:mb-24">
          <h2 className="animate-fade-in bg-gradient-to-r from-[#ECECEC] via-zinc-300 to-[#ECECEC] bg-clip-text text-[1.65rem] font-semibold leading-tight tracking-tight text-transparent sm:text-4xl md:text-5xl">
            PromptPerfect
          </h2>
          <p className="animate-fade-in animate-fade-in-delay-1 mx-auto mt-4 max-w-2xl break-words px-1 text-sm leading-relaxed text-zinc-400 sm:mt-5 sm:text-base md:text-lg">
            The open-source prompt optimizer that teaches you why
          </p>

          <div className="mx-auto mt-10 grid w-full max-w-2xl grid-cols-1 gap-4 sm:mt-12 sm:grid-cols-3 sm:gap-6 md:gap-8 md:mt-16">
            {steps.map(({ icon: Icon, label }, i) => (
              <div
                key={label}
                className={`animate-fade-in flex min-w-0 flex-col items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-5 sm:px-6 sm:py-7 ${i === 0 ? 'animate-fade-in-delay-2' : i === 1 ? 'animate-fade-in-delay-3' : 'animate-fade-in-delay-4'}`}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-[#4552FF]">
                  <Icon className="h-6 w-6" aria-hidden />
                </div>
                <span className="break-words text-center text-sm font-medium leading-snug text-[#ECECEC] sm:text-base">
                  {label}
                </span>
              </div>
            ))}
          </div>

          <div className="animate-fade-in animate-fade-in-delay-4 mx-auto mt-8 w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-4 sm:mt-10 sm:px-6 sm:py-5">
            <p className="break-words text-center text-sm leading-relaxed text-zinc-400 sm:text-base">
              Free. Open-source. Your API key never leaves your browser.
            </p>
          </div>

          <div className="animate-fade-in animate-fade-in-delay-5 mt-8 flex w-full max-w-xl flex-col items-stretch gap-3 sm:mt-10 sm:items-center">
            <div className="flex w-full flex-col gap-2 sm:max-w-lg sm:flex-row sm:flex-wrap sm:justify-center sm:gap-3">
              <Link
                href="/app"
                className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-[#4552FF] px-4 py-3 text-center text-sm font-medium text-white shadow-sm transition-colors hover:opacity-90 active:scale-[0.98] sm:flex-none sm:px-6 sm:text-base"
              >
                Try Free
              </Link>
              <a
                href={EXTENSION_README_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-zinc-600 bg-zinc-900/60 px-4 py-3 text-center text-sm font-medium text-[#ECECEC] transition-colors hover:border-zinc-500 hover:bg-zinc-800/80 sm:flex-none sm:px-6 sm:text-base"
              >
                Install Extension
                <ExternalLink className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
              </a>
              <Link
                href="/docs"
                className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-[#4552FF]/50 px-4 py-3 text-center text-sm font-medium text-[#4552FF] transition-colors hover:bg-[#4552FF]/10 sm:flex-none sm:px-6 sm:text-base"
              >
                API Docs
              </Link>
            </div>
            <Link
              href="/signup"
              className="text-center text-sm text-zinc-500 transition-colors hover:text-zinc-300"
            >
              Create an account for unlimited access →
            </Link>
          </div>
        </section>

        <section
          aria-labelledby="works-everywhere-heading"
          className="mb-16 min-w-0 sm:mb-20 md:mb-24"
        >
          <h2
            id="works-everywhere-heading"
            className="text-center text-xl font-semibold tracking-tight text-[#ECECEC] sm:text-2xl md:text-3xl"
          >
            Works Everywhere
          </h2>
          <p className="mx-auto mt-3 max-w-2xl px-1 text-center text-xs text-zinc-400 sm:text-sm md:text-base">
            Use PromptPerfect in the browser, on any site with our extension, or from your own
            stack via the API.
          </p>

          <div className="mx-auto mt-8 grid w-full max-w-5xl grid-cols-1 gap-5 sm:mt-10 sm:gap-6 lg:grid-cols-3 lg:gap-8">
            <article className="flex min-w-0 flex-col rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 sm:p-7">
              <div className="mb-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-[#4552FF]">
                <Globe className="h-6 w-6" aria-hidden />
              </div>
              <h3 className="text-lg font-semibold text-[#ECECEC]">Web App</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                Full optimizer workspace: paste a prompt, pick a mode, and learn why the rewrite
                works.
              </p>
              <Link
                href="/app"
                className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#4552FF] px-4 py-2.5 text-sm font-medium text-[#4552FF] transition-colors hover:bg-[#4552FF]/10"
              >
                Open web app
              </Link>
            </article>

            <article className="flex min-w-0 flex-col rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 sm:p-7">
              <div className="mb-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-[#4552FF]">
                <Puzzle className="h-6 w-6" aria-hidden />
              </div>
              <h3 className="text-lg font-semibold text-[#ECECEC]">Chrome Extension</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                Optimize prompts where you already work—ChatGPT, Gmail, and more.
              </p>
              <div
                className="mt-4 flex aspect-video w-full items-center justify-center rounded-lg border border-dashed border-zinc-700 bg-zinc-950/80 text-center text-xs text-zinc-500"
                role="img"
                aria-label="Extension screenshot placeholder"
              >
                Screenshot placeholder
              </div>
              <a
                href={EXTENSION_README_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-[#4552FF] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90"
              >
                Install Extension
                <ExternalLink className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
              </a>
              <p className="mt-3 text-center text-xs leading-relaxed text-zinc-500">
                Step-by-step: load unpacked or publish to the Chrome Web Store — see the{' '}
                <a
                  href={EXTENSION_README_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#4552FF] underline-offset-2 hover:underline"
                >
                  extension README on GitHub
                </a>
                . API reference for the extension flow:{' '}
                <Link href="/docs#chrome-extension" className="text-[#4552FF] hover:underline">
                  Chrome extension (docs)
                </Link>
                .
              </p>
            </article>

            <article className="flex min-w-0 flex-col rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 sm:p-7">
              <div className="mb-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-[#4552FF]">
                <Code2 className="h-6 w-6" aria-hidden />
              </div>
              <h3 className="text-lg font-semibold text-[#ECECEC]">API</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                POST your draft prompt and stream back an optimized version from your backend or
                scripts.
              </p>
              <pre className="mt-4 max-h-40 overflow-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-left text-[10px] leading-relaxed text-zinc-300 sm:text-xs">
                <code>{apiSnippet}</code>
              </pre>
              <Link
                href="/docs"
                className="mt-4 inline-flex min-h-[44px] items-center justify-center text-sm font-medium text-[#4552FF] underline-offset-2 hover:underline"
              >
                API Docs →
              </Link>
            </article>
          </div>
        </section>
      </div>

      <footer className="border-t border-zinc-800 bg-background px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-7xl text-center text-xs text-zinc-400 sm:text-sm">
          <p>© 2026 PromptPerfect. Open Source under MIT License.</p>
          <p className="mt-2 text-zinc-500">Built by Beagle Builder Program</p>
        </div>
      </footer>
    </main>
  );
}
