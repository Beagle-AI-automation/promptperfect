import {
  Clipboard,
  Code2,
  Globe,
  Puzzle,
  Sparkles,
  Wand2,
} from 'lucide-react';
import Link from 'next/link';
import { LandingHeader } from '@/components/LandingHeader';
import { Button } from '@/components/ui/Button';

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

export default function Page() {
  return (
    <main className="bg-background text-foreground flex min-h-screen min-w-0 flex-col overflow-x-hidden font-sans">
      <LandingHeader />

      <div className="mx-auto w-full min-w-0 max-w-5xl flex-1 px-4 py-16 sm:px-6 md:px-8 lg:px-10">
        <section className="mb-20 min-w-0 text-center md:mb-24">
          <h2 className="animate-fade-in bg-gradient-to-r from-[#ECECEC] via-zinc-300 to-[#ECECEC] bg-clip-text text-3xl font-semibold leading-tight tracking-tight text-transparent sm:text-4xl md:text-5xl">
            PromptPerfect
          </h2>
          <p className="animate-fade-in animate-fade-in-delay-1 mx-auto mt-4 max-w-2xl break-words px-1 text-base leading-relaxed text-zinc-400 sm:mt-5 sm:text-lg">
            The open-source prompt optimizer that teaches you why
          </p>

          <div className="mx-auto mt-12 grid w-full max-w-2xl grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-8 md:mt-16">
            {steps.map(({ icon: Icon, label }, i) => (
              <div
                key={label}
                className={`animate-fade-in flex min-w-0 flex-col items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-6 sm:px-6 sm:py-7 ${i === 0 ? 'animate-fade-in-delay-2' : i === 1 ? 'animate-fade-in-delay-3' : 'animate-fade-in-delay-4'}`}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-accent-text">
                  <Icon className="h-6 w-6" aria-hidden />
                </div>
                <span className="break-words text-center text-sm font-medium leading-snug text-[#ECECEC] sm:text-base">
                  {label}
                </span>
              </div>
            ))}
          </div>

          <div className="animate-fade-in animate-fade-in-delay-4 mx-auto mt-10 w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-5 sm:mt-12 sm:px-6">
            <p className="break-words text-center text-base leading-relaxed text-zinc-400">
              Free. Open-source. Your API key never leaves your browser.
            </p>
          </div>

          <Link
            href="/app"
            className="animate-fade-in animate-fade-in-delay-5 mt-10 inline-block sm:mt-12"
          >
            <Button size="lg" className="active:scale-[0.98]">
              Try for Free - Get Started!
            </Button>
          </Link>
        </section>

        <section
          aria-labelledby="works-everywhere-heading"
          className="mb-20 min-w-0 text-center md:mb-24"
        >
          <h2
            id="works-everywhere-heading"
            className="text-2xl font-semibold tracking-tight text-[#ECECEC] sm:text-3xl"
          >
            Works Everywhere
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base">
            Use PromptPerfect in the browser, on any site with our extension, or from your own
            stack via the API.
          </p>

          <div className="mx-auto mt-10 grid w-full max-w-5xl grid-cols-1 items-stretch gap-6 sm:grid-cols-3 sm:gap-6">
            {/* Web App */}
            <article className="flex min-w-0 flex-col rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 text-left">
              <div className="mb-4 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-accent-text">
                <Globe className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="text-base font-semibold text-[#ECECEC]">Web App</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-400">
                Full optimizer workspace: paste a prompt, pick a mode, and learn why the rewrite
                works.
              </p>
              <Link href="/app" className="mt-6 inline-block">
                <Button size="md" variant="secondary">
                  Open web app
                </Button>
              </Link>
            </article>

            {/* Chrome Extension */}
            <article className="flex min-w-0 flex-col rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 text-left">
              <div className="mb-4 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-accent-text">
                <Puzzle className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="text-base font-semibold text-[#ECECEC]">Chrome Extension</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-400">
                Optimize prompts where you already work—ChatGPT, Gmail, and more.
              </p>
              <Link href="/docs#chrome-extension" className="mt-6 inline-block">
                <Button size="md">Add to Chrome</Button>
              </Link>
              <p className="mt-3 text-xs text-zinc-500">
                Load unpacked or install from the Web Store—see{' '}
                <Link href="/docs#chrome-extension" className="text-accent-text underline">
                  docs
                </Link>
                .
              </p>
            </article>

            {/* API */}
            <article className="flex min-w-0 flex-col rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 text-left">
              <div className="mb-4 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-accent-text">
                <Code2 className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="text-base font-semibold text-[#ECECEC]">API</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-400">
                POST your draft prompt and stream back an optimized version from your backend or
                scripts.
              </p>
              <Link href="/docs" className="mt-6 inline-block">
                <Button size="md" variant="outline">
                  Read the Docs →
                </Button>
              </Link>
            </article>
          </div>
        </section>
      </div>

      <footer className="border-t border-zinc-800 bg-background px-6 py-10">
        <div className="mx-auto max-w-7xl text-center text-sm text-zinc-400">
          <p>© 2026 PromptPerfect. Open Source under MIT License.</p>
          <p className="mt-2 text-zinc-500">Built by Beagle Builder Program</p>
        </div>
      </footer>
    </main>
  );
}
