"use client";

import { useState } from "react";
import { Clipboard, Wand2, Sparkles } from "lucide-react";
import { Header } from "@/components/Header";
import { PromptInput } from "@/components/PromptInput";
import { ModeSelector } from "@/components/ModeSelector";
import type { OptimizeMode } from "@/components/ModeSelector";

const steps = [
  {
    icon: Clipboard,
    label: "Paste your prompt",
  },
  {
    icon: Wand2,
    label: "Optimize with one click",
  },
  {
    icon: Sparkles,
    label: "Learn why it’s better",
  },
];

export default function Page() {
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<OptimizeMode>("better");

  return (
    <main className="flex min-h-screen min-w-0 flex-col overflow-x-hidden bg-zinc-50 font-sans dark:bg-zinc-950">
      <div className="mx-auto w-full min-w-0 max-w-5xl flex-1 px-4 py-16 sm:px-6 md:px-8 lg:px-10">
        <Header />

        {/* Hero */}
        <section className="mb-20 min-w-0 text-center md:mb-24">
          <h2 className="animate-fade-in bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-900 bg-clip-text text-3xl font-semibold leading-tight tracking-tight text-transparent dark:from-zinc-100 dark:via-zinc-300 dark:to-zinc-100 sm:text-4xl md:text-5xl">
            PromptPerfect
          </h2>
          <p className="animate-fade-in animate-fade-in-delay-1 mx-auto mt-4 max-w-2xl break-words px-1 text-base leading-relaxed text-zinc-600 dark:text-zinc-400 sm:mt-5 sm:text-lg">
            The open-source prompt optimizer that teaches you why
          </p>

          <div className="mx-auto mt-12 grid w-full max-w-2xl grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-8 md:mt-16">
            {steps.map(({ icon: Icon, label }, i) => (
              <div
                key={label}
                className={`animate-fade-in flex min-w-0 flex-col items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-6 dark:border-zinc-800 dark:bg-zinc-900/50 sm:px-6 sm:py-7 ${i === 0 ? "animate-fade-in-delay-2" : i === 1 ? "animate-fade-in-delay-3" : "animate-fade-in-delay-4"}`}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  <Icon className="h-6 w-6" aria-hidden />
                </div>
                <span className="break-words text-center text-sm font-medium leading-snug text-zinc-700 dark:text-zinc-300 sm:text-base">
                  {label}
                </span>
              </div>
            ))}
          </div>

          <div className="animate-fade-in animate-fade-in-delay-4 mx-auto mt-10 w-full max-w-lg rounded-xl border border-zinc-200 bg-white px-4 py-5 sm:mt-12 sm:px-6">
            <p className="break-words text-center text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
              Free. Open-source. Your API key never leaves your browser.
            </p>
          </div>

          <a
            href="#optimizer"
            className="animate-fade-in animate-fade-in-delay-5 mt-10 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-zinc-900 px-6 py-3 text-base font-medium text-white shadow-sm transition-colors hover:bg-zinc-800 active:scale-[0.98] dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 sm:mt-12"
          >
            Try it now
          </a>

          <footer className="animate-fade-in animate-fade-in-delay-5 mt-16 flex flex-wrap items-center justify-center gap-6 border-t border-zinc-200 pt-10 dark:border-zinc-800 md:mt-20 md:gap-8">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-sm font-medium text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400"
            >
              GitHub
            </a>
            <span className="rounded-md border border-zinc-200 bg-zinc-100 px-2.5 py-1.5 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
              MIT
            </span>
          </footer>
        </section>

        {/* Optimizer */}
        <section id="optimizer" className="scroll-mt-16 min-w-0 pt-2">
          <div className="flex min-w-0 flex-col gap-8">
            <PromptInput value={prompt} onChange={setPrompt} />
            <ModeSelector selected={mode} onSelect={setMode} />
          </div>
        </section>
      </div>
    </main>
  );
}
