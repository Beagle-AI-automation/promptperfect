import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Docs | PromptPerfect",
  description: "Chrome extension install and API reference for PromptPerfect",
};

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-zinc-50 font-sans dark:bg-zinc-950">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 md:px-8">
        <p className="text-sm font-medium text-[#4552FF]">
          <Link href="/" className="hover:underline">
            ← Back to home
          </Link>
        </p>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Documentation
        </h1>
        <p className="mt-3 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
          Quick references for the Chrome extension and HTTP API.
        </p>

        <section
          id="chrome-extension"
          className="mt-14 scroll-mt-20 border-t border-zinc-200 pt-12 dark:border-zinc-800"
        >
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            Chrome extension
          </h2>
          <p className="mt-3 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            When a listing is available, use{" "}
            <strong className="font-medium text-zinc-800 dark:text-zinc-200">
              Add to Chrome
            </strong>{" "}
            from the home page (set{" "}
            <code className="rounded bg-zinc-200 px-1 py-0.5 text-sm dark:bg-zinc-800">
              NEXT_PUBLIC_CHROME_WEBSTORE_URL
            </code>{" "}
            in your environment to point at the Chrome Web Store).
          </p>
          <h3 className="mt-8 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Local install (unpacked)
          </h3>
          <ol className="mt-4 list-decimal space-y-3 pl-5 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            <li>
              Clone the repo and open{" "}
              <code className="rounded bg-zinc-200 px-1 py-0.5 text-sm dark:bg-zinc-800">
                chrome://extensions
              </code>{" "}
              in Chrome.
            </li>
            <li>Enable Developer mode.</li>
            <li>
              Click <strong className="text-zinc-800 dark:text-zinc-200">Load unpacked</strong>{" "}
              and select the{" "}
              <code className="rounded bg-zinc-200 px-1 py-0.5 text-sm dark:bg-zinc-800">
                extension
              </code>{" "}
              directory in this project.
            </li>
          </ol>
        </section>

        <section
          id="api"
          className="mt-14 scroll-mt-20 border-t border-zinc-200 pt-12 dark:border-zinc-800"
        >
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            API
          </h2>
          <p className="mt-3 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            <code className="rounded bg-zinc-200 px-1 py-0.5 text-sm dark:bg-zinc-800">
              POST /api/optimize
            </code>{" "}
            with JSON body:
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-base text-zinc-600 dark:text-zinc-400">
            <li>
              <code className="text-sm">prompt</code> (string, required)
            </li>
            <li>
              <code className="text-sm">mode</code> (optional):{" "}
              <code className="text-sm">better</code>,{" "}
              <code className="text-sm">shorter</code>, or{" "}
              <code className="text-sm">longer</code>
            </li>
            <li>
              <code className="text-sm">apiKey</code> (optional): forwarded when
              using your own provider key
            </li>
          </ul>
          <p className="mt-6 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            Response JSON includes{" "}
            <code className="text-sm">optimizedText</code>,{" "}
            <code className="text-sm">explanation</code>, and{" "}
            <code className="text-sm">mode</code>.
          </p>
        </section>
      </div>
    </main>
  );
}
