'use client';

import Link from 'next/link';
import { Clipboard, Wand2, Sparkles } from 'lucide-react';

export function Hero() {
  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-white to-zinc-50 dark:from-zinc-950 dark:to-zinc-900">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-6xl dark:text-zinc-50">
            PromptPerfect
          </h1>
          <p className="mt-6 text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            The open-source prompt optimizer that teaches you why. Stop guessing and start engineering better prompts with instant feedback and detailed explanations.
          </p>
          
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link
              href="/app"
              className="cursor-pointer rounded-md bg-[#4552FF] px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4552FF]"
            >
              Try for Free - Get Started!
            </Link>
            <a href="https://github.com/Beagle-AI-automation/promptperfect.git" target="_blank" rel="noreferrer" className="text-sm font-semibold leading-6 text-zinc-900 dark:text-zinc-100">
              View on GitHub <span aria-hidden="true">→</span>
            </a>
          </div>

          <div className="mt-10 inline-block border-l-4 border-[#4552FF] bg-zinc-50 p-4 text-left dark:bg-zinc-900">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-200">
              Free. Open-source. Your API key never leaves your browser.
            </p>
          </div>
        </div>
        
        <div className="mx-auto mt-8 flex flex-col justify-center gap-8 sm:flex-row">
          <div className="flex flex-1 flex-col items-start rounded-2xl bg-zinc-50 p-8 dark:bg-zinc-900">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[#4552FF]">
              <Clipboard className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-base font-semibold leading-7 text-zinc-900 dark:text-zinc-100">1. Paste Prompt</h3>
            <p className="mt-2 text-base leading-7 text-zinc-600 dark:text-zinc-400">
              Enter your draft prompt. It can be messy, vague, or just a rough idea.
            </p>
          </div>
          
          <div className="flex flex-1 flex-col items-start rounded-2xl bg-zinc-50 p-8 dark:bg-zinc-900">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[#4552FF]">
              <Wand2 className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-base font-semibold leading-7 text-zinc-900 dark:text-zinc-100">2. Optimize</h3>
            <p className="mt-2 text-base leading-7 text-zinc-600 dark:text-zinc-400">
              Choose a mode (Better, Specific, or Chain-of-Thought) and let AI refine it.
            </p>
          </div>

          <div className="flex flex-1 flex-col items-start rounded-2xl bg-zinc-50 p-8 dark:bg-zinc-900">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[#4552FF]">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-base font-semibold leading-7 text-zinc-900 dark:text-zinc-100">3. Learn Why</h3>
            <p className="mt-2 text-base leading-7 text-zinc-600 dark:text-zinc-400">
              See exactly what changed and why, so you become a better prompt engineer.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
