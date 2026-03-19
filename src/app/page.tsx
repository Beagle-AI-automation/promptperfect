"use client";

import { useState, useCallback } from "react";
import { Clipboard, Wand2, Sparkles } from "lucide-react";
import { Header } from "@/components/Header";
import { ApiKeyDialog } from "@/components/ApiKeyDialog";
import { PromptInput } from "@/components/PromptInput";
import { ModeSelector } from "@/components/ModeSelector";
import { PromptOutput } from "@/components/PromptOutput";
import { HistoryPanel } from "@/components/HistoryPanel";
import type { OptimizeMode } from "@/components/ModeSelector";
import { saveToHistory } from "@/lib/history";
import type { HistoryItem } from "@/lib/history";

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

const BYOK_STORAGE_KEY = "pp_api_key";

export default function Page() {
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<OptimizeMode>("better");
  const [optimized, setOptimized] = useState("");
  const [explanation, setExplanation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);

  const handleSaveApiKey = useCallback((key: string) => {
    localStorage.setItem(BYOK_STORAGE_KEY, key);
  }, []);

  const handleOptimize = useCallback(async () => {
    const original = prompt.trim();
    if (!original) return;
    setLoading(true);
    setError(null);
    try {
      const apiKey =
        typeof window !== "undefined"
          ? localStorage.getItem(BYOK_STORAGE_KEY)
          : null;
      const res = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: original,
          mode,
          apiKey: apiKey ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Optimization failed");
        return;
      }
      setOptimized(data.optimizedText ?? "");
      setExplanation(data.explanation ?? "");
      await saveToHistory(
        original,
        data.optimizedText ?? "",
        data.mode ?? mode,
        data.explanation ?? ""
      );
      setHistoryRefreshKey((k) => k + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, [prompt, mode]);

  const handleSelectHistoryItem = useCallback((item: HistoryItem) => {
    setPrompt(item.prompt_original);
    setOptimized(item.prompt_optimized);
    setExplanation(item.explanation ?? "");
  }, []);

  return (
    <main className="flex min-h-screen min-w-0 flex-col overflow-x-hidden bg-zinc-50 font-sans dark:bg-zinc-950">
      <div className="mx-auto w-full min-w-0 max-w-5xl flex-1 px-4 py-16 sm:px-6 md:px-8 lg:px-10">
        <Header onApiKeyClick={() => setApiKeyDialogOpen(true)} />
        <ApiKeyDialog
          key={String(apiKeyDialogOpen)}
          open={apiKeyDialogOpen}
          onClose={() => setApiKeyDialogOpen(false)}
          onSave={handleSaveApiKey}
          title="Bring your own API key"
        />

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
          <div className="grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-[1fr_280px]">
            <div className="flex min-w-0 flex-col gap-8">
              <PromptInput
                value={prompt}
                onChange={setPrompt}
                disabled={loading}
              />
              <ModeSelector
                selected={mode}
                onSelect={setMode}
                disabled={loading}
              />
              <div>
                <button
                  type="button"
                  onClick={handleOptimize}
                  disabled={loading || !prompt.trim()}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-xl bg-zinc-900 px-6 py-3 text-base font-medium text-white shadow-sm transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {loading ? (
                    "Optimizing…"
                  ) : (
                    <>
                      <Wand2 className="h-5 w-5" aria-hidden />
                      Optimize
                    </>
                  )}
                </button>
                {error && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                    {error}
                  </p>
                )}
              </div>
              {(optimized || explanation) && (
                <PromptOutput
                  original={prompt}
                  optimized={optimized}
                  explanation={explanation}
                />
              )}
            </div>
            <aside className="min-w-0 lg:max-w-[280px]">
              <HistoryPanel
                onSelectItem={handleSelectHistoryItem}
                refreshKey={historyRefreshKey}
              />
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
