import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'API Docs — PromptPerfect by Beagle',
  description:
    'Optimize prompts over HTTP with POST /api/optimize-sync — schemas, examples, modes, and BYOK.',
};

const BASE = 'https://your-deployment.example.com';

function CodeBlock({ children, title }: { children: string; title?: string }) {
  return (
    <div className="mt-3">
      {title ? (
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">{title}</p>
      ) : null}
      <pre className="max-w-full overflow-x-auto rounded-xl border border-zinc-800 bg-[#0a0a0a] p-4 text-left text-[13px] leading-relaxed text-zinc-300">
        <code className="font-mono">{children}</code>
      </pre>
    </div>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-zinc-800 pt-12 first:border-t-0 first:pt-0">
      <h2 className="text-xl font-semibold tracking-tight text-[#ECECEC] sm:text-2xl">{title}</h2>
      <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-zinc-400">{children}</div>
    </section>
  );
}

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-[#050505] px-4 py-10 pb-20 font-sans text-[#ECECEC] sm:px-6 md:py-14 lg:px-10">
      <div className="mx-auto max-w-3xl lg:max-w-4xl">
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <Link href="/" className="font-medium text-[#4552FF] hover:underline">
            ← Home
          </Link>
          <span className="text-zinc-600" aria-hidden>
            ·
          </span>
          <span className="text-zinc-500">API reference</span>
        </nav>

        <header className="mt-8">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">API reference</h1>
          <p className="mt-4 max-w-2xl text-lg text-zinc-400">
            Synchronous prompt optimization over HTTPS. One endpoint, copy-paste examples, no SDK
            required.
          </p>
        </header>

        <nav
          aria-label="On this page"
          className="mt-10 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">On this page</p>
          <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            {[
              ['#overview', 'Overview'],
              ['#authentication', 'Authentication'],
              ['#post-optimize-sync', 'POST /api/optimize-sync'],
              ['#modes', 'Modes'],
              ['#rate-limits', 'Rate limits'],
              ['#examples', 'Examples'],
            ].map(([href, label]) => (
              <li key={href}>
                <a href={href} className="text-[#4552FF] hover:underline">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-14 space-y-0">
          <Section id="overview" title="Overview">
            <p>
              PromptPerfect exposes a single JSON API for non-streaming optimization. Send your
              draft prompt and a <strong className="font-medium text-zinc-300">mode</strong>; the
              response includes the optimized prompt plus human-readable explanation and change
              notes.
            </p>
            <p>
              <strong className="font-medium text-zinc-300">Base URL</strong> — use your own
              deployment origin (local or hosted), for example:
            </p>
            <CodeBlock>{`${BASE}`}</CodeBlock>
            <p className="text-sm text-zinc-500">
              All paths below are rooted at that origin (e.g.{' '}
              <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-300">
                {BASE}/api/optimize-sync
              </code>
              ).
            </p>
          </Section>

          <Section id="authentication" title="Authentication">
            <p>
              No API key is required to <em>call</em> the route if your server is configured with a
              Gemini key (see environment variables below). For{' '}
              <strong className="font-medium text-zinc-300">OpenAI</strong> or{' '}
              <strong className="font-medium text-zinc-300">Anthropic</strong>, you must bring your
              own key (BYOK).
            </p>
            <ul className="list-disc space-y-2 pl-5 text-zinc-400">
              <li>
                <strong className="text-zinc-300">Bearer token</strong> —{' '}
                <code className="text-zinc-300">Authorization: Bearer &lt;api_key&gt;</code>
                . The token is forwarded to the provider and is not stored by PromptPerfect.
              </li>
              <li>
                <strong className="text-zinc-300">JSON body</strong> — optional{' '}
                <code className="text-zinc-300">apiKey</code> field (same semantics as Bearer).
              </li>
              <li>
                <strong className="text-zinc-300">Gemini (default)</strong> — if{' '}
                <code className="text-zinc-300">provider</code> is omitted or{' '}
                <code className="text-zinc-300">&quot;gemini&quot;</code>, the server uses{' '}
                <code className="text-zinc-300">GOOGLE_GENERATIVE_AI_API_KEY</code>,{' '}
                <code className="text-zinc-300">GEMINI_API_KEY</code>, or{' '}
                <code className="text-zinc-300">GOOGLE_API_KEY</code> from the deployment environment
                when you do not pass a key in the request.
              </li>
            </ul>
            <p className="text-sm text-zinc-500">
              Keys are only used in-memory for the outbound model request; do not log them on the
              client.
            </p>
          </Section>

          <Section id="post-optimize-sync" title="POST /api/optimize-sync">
            <p>
              Returns a complete optimization in one response. Supports CORS (
              <code className="text-zinc-300">OPTIONS</code> preflight).
            </p>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-md bg-[#4552FF] px-2 py-0.5 font-mono text-xs font-semibold text-white">
                  POST
                </span>
                <code className="font-mono text-zinc-300">/api/optimize-sync</code>
              </div>
            </div>

            <h3 className="!mt-8 text-base font-semibold text-[#ECECEC]">Request body</h3>
            <p>
              JSON object. Use <code className="text-zinc-300">text</code> or{' '}
              <code className="text-zinc-300">prompt</code> for the draft (at least one required,
              non-empty).
            </p>
            <CodeBlock
              title="Schema"
            >{`{
  "text": string,           // preferred; or use "prompt"
  "prompt": string,         // alternative to "text"
  "mode": "better" | "specific" | "cot" | "developer" | "research" | "beginner" | "product" | "marketing",
  "provider": "gemini" | "openai" | "anthropic",  // optional, default "gemini"
  "apiKey": string,         // optional; same as Bearer (BYOK)
  "session_id": string,     // optional; for analytics when Supabase is configured
  "version": "v1" | "v2"    // optional; default "v1"
}`}</CodeBlock>

            <h3 className="!mt-8 text-base font-semibold text-[#ECECEC]">Response</h3>
            <p>
              <code className="text-zinc-300">200 OK</code> with JSON. The{' '}
              <code className="text-zinc-300">changes</code> field is a{' '}
              <strong className="text-zinc-300">string</strong> containing newline-separated
              bullet lines (not a JSON array). Split on newlines and trim if you need an array in
              your client.
            </p>
            <CodeBlock
              title="Schema"
            >{`{
  "optimizedText": string,
  "explanation": string,
  "changes": string,
  "rawText": string,
  "provider": string,
  "model": string
}`}</CodeBlock>
            <p className="text-sm text-zinc-500">
              Errors return <code className="text-zinc-400">4xx</code> or{' '}
              <code className="text-zinc-400">5xx</code> with{' '}
              <code className="text-zinc-400">{`{ "error": string }`}</code>.
            </p>

            <h3 className="!mt-8 text-base font-semibold text-[#ECECEC]">Examples</h3>

            <CodeBlock title="cURL">{`curl -s -X POST "${BASE}/api/optimize-sync" \\
  -H "Content-Type: application/json" \\
  -d '{
    "text": "Write a good email to my team about the deadline.",
    "mode": "better"
  }'`}</CodeBlock>

            <CodeBlock title="JavaScript (fetch)">{`const res = await fetch("${BASE}/api/optimize-sync", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    text: "Write a good email to my team about the deadline.",
    mode: "better",
  }),
});

const data = await res.json();
if (!res.ok) throw new Error(data.error ?? res.statusText);

console.log(data.optimizedText);
console.log(data.explanation);
console.log(data.changes);`}</CodeBlock>

            <CodeBlock title="Python (requests)">{`import requests

r = requests.post(
    "${BASE}/api/optimize-sync",
    json={
        "text": "Write a good email to my team about the deadline.",
        "mode": "better",
    },
    timeout=120,
)
r.raise_for_status()
data = r.json()

print(data["optimizedText"])
print(data["explanation"])
print(data["changes"])`}</CodeBlock>

            <p className="text-sm text-zinc-500">
              With BYOK: add header{' '}
              <code className="text-zinc-400">Authorization: Bearer sk-...</code> or include{' '}
              <code className="text-zinc-400">apiKey</code> in the JSON body.
            </p>
          </Section>

          <Section id="modes" title="Modes explained">
            <p>
              The <code className="text-zinc-300">mode</code> selects the system instructions for
              the optimizer. Invalid values fall back to <code className="text-zinc-300">better</code>
              .
            </p>
            <dl className="space-y-6">
              <div>
                <dt className="font-mono text-sm font-semibold text-[#4552FF]">better</dt>
                <dd className="mt-1 text-zinc-400">
                  General improvement: clearer goals, stronger structure, and safer defaults while
                  keeping the same intent.
                </dd>
              </div>
              <div>
                <dt className="font-mono text-sm font-semibold text-[#4552FF]">specific</dt>
                <dd className="mt-1 text-zinc-400">
                  Adds audience, constraints, format, success criteria, and edge cases so the model
                  has less room to guess.
                </dd>
              </div>
              <div>
                <dt className="font-mono text-sm font-semibold text-[#4552FF]">cot</dt>
                <dd className="mt-1 text-zinc-400">
                  Chain-of-thought style: explicit steps, verify-before-answer, and structured
                  reasoning without unnecessary bloat.
                </dd>
              </div>
            </dl>
            <p className="text-sm text-zinc-500">
              Additional modes on the same endpoint:{' '}
              <code className="text-zinc-400">developer</code>, <code className="text-zinc-400">research</code>,{' '}
              <code className="text-zinc-400">beginner</code>, <code className="text-zinc-400">product</code>,{' '}
              <code className="text-zinc-400">marketing</code> — each biases the rewrite toward that
              use case.
            </p>
          </Section>

          <Section id="rate-limits" title="Rate limits">
            <p>
              PromptPerfect does not ship a built-in per-client rate limit on this route. Throughput
              is bounded by your hosting provider and by the{' '}
              <strong className="text-zinc-300">LLM provider&apos;s quotas</strong>.
            </p>
            <p>
              When callers rely on the deployment&apos;s default{' '}
              <strong className="text-zinc-300">Gemini</strong> key (shared &quot;free tier&quot;
              style setup), all traffic shares that key&apos;s Google AI Studio / API quotas. For
              production or higher volume, use{' '}
              <strong className="text-zinc-300">BYOK</strong> (your own keys via{' '}
              <code className="text-zinc-300">Authorization</code> or{' '}
              <code className="text-zinc-300">apiKey</code>) so limits follow your account.
            </p>
          </Section>

          <Section id="examples" title="Examples">
            <p className="text-sm text-zinc-500">
              Illustrative before → after snippets (not live API output).
            </p>

            <div className="space-y-10">
              <article className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 sm:p-6">
                <h3 className="text-base font-semibold text-[#ECECEC]">1. Vague product ask</h3>
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Mode: <span className="text-[#4552FF]">better</span>
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-zinc-500">Before</p>
                    <p className="mt-1 rounded-lg border border-zinc-800 bg-[#0a0a0a] p-3 text-sm text-zinc-300">
                      Make the onboarding better.
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">After (optimized)</p>
                    <p className="mt-1 rounded-lg border border-[#4552FF]/30 bg-[#0a0a0a] p-3 text-sm text-zinc-300">
                      Rewrite our SaaS onboarding so new users reach their first success within 10
                      minutes. Target: product managers evaluating the tool. Deliver: 5 concrete
                      UI/copy changes with rationale and a success metric (e.g. activation rate).
                    </p>
                  </div>
                </div>
              </article>

              <article className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 sm:p-6">
                <h3 className="text-base font-semibold text-[#ECECEC]">2. Research question</h3>
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Mode: <span className="text-[#4552FF]">specific</span>
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-zinc-500">Before</p>
                    <p className="mt-1 rounded-lg border border-zinc-800 bg-[#0a0a0a] p-3 text-sm text-zinc-300">
                      What should we know about competitors?
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">After (optimized)</p>
                    <p className="mt-1 rounded-lg border border-[#4552FF]/30 bg-[#0a0a0a] p-3 text-sm text-zinc-300">
                      For our B2B analytics product (ACV $15–50k), summarize the top 3 direct
                      competitors. Include: pricing model, key differentiator, weakest feature vs us,
                      and one objection buyers raise. Use only 2024–2026 public sources; note
                      uncertainty where data is thin. Output: table + 5 bullet strategic takeaways.
                    </p>
                  </div>
                </div>
              </article>

              <article className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 sm:p-6">
                <h3 className="text-base font-semibold text-[#ECECEC]">3. Debugging help</h3>
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Mode: <span className="text-[#4552FF]">cot</span>
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-zinc-500">Before</p>
                    <p className="mt-1 rounded-lg border border-zinc-800 bg-[#0a0a0a] p-3 text-sm text-zinc-300">
                      My React app is slow, fix it.
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">After (optimized)</p>
                    <p className="mt-1 rounded-lg border border-[#4552FF]/30 bg-[#0a0a0a] p-3 text-sm text-zinc-300">
                      Act as a React performance engineer. First, list plausible causes of UI jank
                      (render thrashing, large lists, effects, bundle size). Then ask for the
                      minimum repro: React version, profiler screenshot, and which interaction lags.
                      Finally, give an ordered checklist to diagnose (React DevTools Profiler,
                      why-did-you-render, network waterfall) before suggesting code changes.
                    </p>
                  </div>
                </div>
              </article>
            </div>
          </Section>
        </div>

        <footer className="mt-16 border-t border-zinc-800 pt-8 text-center text-sm text-zinc-500">
          <Link href="/" className="text-[#4552FF] hover:underline">
            Back to PromptPerfect
          </Link>
        </footer>
      </div>
    </main>
  );
}
