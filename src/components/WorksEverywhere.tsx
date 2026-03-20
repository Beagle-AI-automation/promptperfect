"use client";

import Link from "next/link";
import { Braces, Globe, Puzzle } from "lucide-react";

const CHROME_HREF =
  process.env.NEXT_PUBLIC_CHROME_WEBSTORE_URL?.trim() ||
  "/docs#chrome-extension";

const apiSnippet = `const res = await fetch("/api/optimize", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    prompt: "Your draft…",
    mode: "better",
  }),
});
const data = await res.json();`;

export function WorksEverywhere() {
  return (
    <section
      className="mb-20 min-w-0 md:mb-24"
      aria-labelledby="works-everywhere-heading"
    >
      <div className="mx-auto max-w-2xl text-center">
        <h2
          id="works-everywhere-heading"
          className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl"
        >
          Works Everywhere
        </h2>
        <p className="mt-3 text-base leading-relaxed text-zinc-600 dark:text-zinc-400 sm:text-lg">
          Use PromptPerfect in the browser, from Chrome, or wire it into your
          own stack via the API.
        </p>
      </div>

      <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
        {/* Web App */}
        <article className="flex min-w-0 flex-col rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/50 sm:p-7">
          <div className="mb-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#4552FF] text-white">
            <Globe className="h-6 w-6" aria-hidden />
          </div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Web App
          </h3>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Paste, optimize, and read explanations—full workflow in your
            browser with your own API key.
          </p>
          <Link
            href="#optimizer"
            className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#4552FF] px-4 py-2.5 text-sm font-semibold text-[#4552FF] transition hover:bg-[#4552FF]/10"
          >
            Open optimizer
          </Link>
        </article>

        {/* Chrome Extension */}
        <article className="flex min-w-0 flex-col rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/50 sm:p-7">
          <div
            className="relative mb-4 aspect-video w-full overflow-hidden rounded-lg border border-dashed border-zinc-300 bg-gradient-to-br from-zinc-100 to-zinc-200 dark:border-zinc-600 dark:from-zinc-800 dark:to-zinc-900"
            role="img"
            aria-label="Chrome extension screenshot placeholder"
          >
            <span className="absolute inset-0 flex items-center justify-center px-4 text-center text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Extension preview
            </span>
          </div>
          <div className="mb-3 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#4552FF] text-white">
            <Puzzle className="h-6 w-6" aria-hidden />
          </div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Chrome Extension
          </h3>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Optimize prompts where you already work. Install from the store or
            load unpacked for local development.
          </p>
          <a
            href={CHROME_HREF}
            target={CHROME_HREF.startsWith("http") ? "_blank" : undefined}
            rel={
              CHROME_HREF.startsWith("http")
                ? "noopener noreferrer"
                : undefined
            }
            className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#4552FF] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            Add to Chrome
          </a>
        </article>

        {/* API */}
        <article className="flex min-w-0 flex-col rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/50 sm:p-7">
          <div className="mb-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#4552FF] text-white">
            <Braces className="h-6 w-6" aria-hidden />
          </div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            API
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            POST JSON to optimize server-side or from your own tools.
          </p>
          <pre
            className="mt-4 max-h-[200px] overflow-x-auto overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-left text-[11px] leading-relaxed text-zinc-800 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 sm:text-xs"
            tabIndex={0}
          >
            <code className="font-mono">{apiSnippet}</code>
          </pre>
          <Link
            href="/docs"
            className="mt-4 inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold text-[#4552FF] underline-offset-4 hover:underline"
          >
            Read the Docs
            <span aria-hidden>→</span>
          </Link>
        </article>
      </div>
    </section>
  );
}
