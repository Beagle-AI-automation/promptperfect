import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'API Documentation — PromptPerfect by Beagle',
  description:
    'Full API reference for PromptPerfect: POST /api/optimize-sync, request and response schemas, examples, modes, BYOK, and rate limits.',
};

const BASE = 'https://promptperfect.vercel.app';

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="mt-3 overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-left text-[12px] leading-relaxed text-zinc-200 sm:p-4 sm:text-[13px]">
      <code className="font-mono whitespace-pre">{children}</code>
    </pre>
  );
}

function SectionTitle({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  return (
    <h2
      id={id}
      className="scroll-mt-6 text-xl font-semibold tracking-tight text-[#ECECEC] sm:text-2xl"
    >
      {children}
    </h2>
  );
}

const nav = [
  { href: '#overview', label: 'Overview' },
  { href: '#authentication', label: 'Authentication' },
  { href: '#optimize-sync', label: 'POST /api/optimize-sync' },
  { href: '#modes', label: 'Modes' },
  { href: '#rate-limits', label: 'Rate limits' },
  { href: '#examples', label: 'Examples' },
  { href: '#chrome-extension', label: 'Chrome extension' },
] as const;

export default function DocsPage() {
  return (
    <div className="bg-background text-foreground min-h-screen font-sans">
      <header className="border-b border-zinc-800 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="text-sm font-semibold text-[#ECECEC] transition-colors hover:text-[#4552FF]"
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

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <header className="border-b border-zinc-800 pb-8">
          <p className="text-xs font-medium uppercase tracking-wider text-[#4552FF]">API</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#ECECEC] sm:text-4xl">
            Reference
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-400">
            One-page, copy-paste friendly documentation for the synchronous optimization endpoint.
            Replace <code className="rounded bg-zinc-900 px-1.5 py-0.5 text-sm text-zinc-200">{BASE}</code>{' '}
            with your deployment origin (or use a relative URL from the same origin in the browser).
          </p>
        </header>

        <nav
          aria-label="On this page"
          className="my-10 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">On this page</p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {nav.map(({ href, label }) => (
              <li key={href}>
                <a
                  href={href}
                  className="text-sm text-[#4552FF] underline-offset-2 hover:underline"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-14 sm:space-y-16">
          <section id="overview" className="scroll-mt-6">
            <SectionTitle id="overview-heading">Overview</SectionTitle>
            <p className="mt-4 text-sm leading-relaxed text-zinc-400 sm:text-base">
              PromptPerfect turns a rough prompt into a clearer, stronger one and returns structured
              text you can use in your product or scripts. The primary machine-friendly endpoint is a
              single JSON request/response:
            </p>
            <dl className="mt-4 space-y-2 text-sm text-zinc-300">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
                <dt className="shrink-0 font-medium text-[#ECECEC]">Base URL</dt>
                <dd>
                  <code className="break-all rounded bg-zinc-900 px-2 py-0.5 text-[#4552FF]">
                    {BASE}
                  </code>
                </dd>
              </div>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
                <dt className="shrink-0 font-medium text-[#ECECEC]">Optimize (sync)</dt>
                <dd>
                  <code className="break-all rounded bg-zinc-900 px-2 py-0.5">POST /api/optimize-sync</code>
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-sm text-zinc-500">
              The web app also uses{' '}
              <code className="rounded bg-zinc-900 px-1.5 py-0.5 text-zinc-300">POST /api/optimize</code>{' '}
              for streaming responses; this page documents the non-streaming JSON API.
            </p>
          </section>

          <section id="authentication" className="scroll-mt-6">
            <SectionTitle id="authentication-heading">Authentication</SectionTitle>
            <div className="mt-4 space-y-4 text-sm leading-relaxed text-zinc-400 sm:text-base">
              <p>
                <strong className="text-[#ECECEC]">Bring your own key (BYOK):</strong> pass the
                provider&apos;s API key either in the JSON body as{' '}
                <code className="rounded bg-zinc-900 px-1.5 py-0.5 text-zinc-200">apiKey</code>, or in
                the{' '}
                <code className="rounded bg-zinc-900 px-1.5 py-0.5 text-zinc-200">Authorization</code>{' '}
                header as{' '}
                <code className="rounded bg-zinc-900 px-1.5 py-0.5 text-zinc-200">Bearer &lt;key&gt;</code>
                . If both are set, the bearer token wins.
              </p>
              <p>
                <strong className="text-[#ECECEC]">Hosted &quot;free tier&quot; (Gemini):</strong> when
                you omit a key and set{' '}
                <code className="rounded bg-zinc-900 px-1.5 py-0.5 text-zinc-200">provider</code> to{' '}
                <code className="rounded bg-zinc-900 px-1.5 py-0.5 text-zinc-200">gemini</code> (the
                default), the server uses its configured environment keys (
                <code className="rounded bg-zinc-900 px-1 py-0.5 text-xs">GOOGLE_GENERATIVE_AI_API_KEY</code>
                ,{' '}
                <code className="rounded bg-zinc-900 px-1 py-0.5 text-xs">GEMINI_API_KEY</code>, or{' '}
                <code className="rounded bg-zinc-900 px-1 py-0.5 text-xs">GOOGLE_API_KEY</code>). That
                quota is <strong className="text-zinc-300">shared</strong> across all anonymous callers
                on that deployment—use BYOK for production or higher volume.
              </p>
              <p>
                For <code className="rounded bg-zinc-900 px-1.5 py-0.5 text-zinc-200">openai</code> or{' '}
                <code className="rounded bg-zinc-900 px-1.5 py-0.5 text-zinc-200">anthropic</code>, you
                must supply a key (body or header) unless the host has set the matching server env var.
              </p>
            </div>
          </section>

          <section id="optimize-sync" className="scroll-mt-6">
            <SectionTitle id="optimize-sync-heading">POST /api/optimize-sync</SectionTitle>
            <p className="mt-4 text-sm text-zinc-400 sm:text-base">
              Returns a complete JSON payload (no streaming). Supports CORS: browsers may preflight
              with <code className="rounded bg-zinc-900 px-1 py-0.5">OPTIONS</code>.
            </p>

            <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-800">
              <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
                <tbody className="text-zinc-300">
                  <tr className="border-b border-zinc-800 bg-zinc-900/30">
                    <th className="px-3 py-2.5 font-medium text-[#ECECEC] sm:px-4">URL</th>
                    <td className="px-3 py-2.5 font-mono text-xs text-[#4552FF] sm:px-4 sm:text-sm">
                      /api/optimize-sync
                    </td>
                  </tr>
                  <tr className="border-b border-zinc-800">
                    <th className="px-3 py-2.5 font-medium text-[#ECECEC] sm:px-4">Method</th>
                    <td className="px-3 py-2.5 font-mono sm:px-4">POST</td>
                  </tr>
                  <tr className="border-b border-zinc-800 bg-zinc-900/30">
                    <th className="px-3 py-2.5 font-medium text-[#ECECEC] sm:px-4">Content-Type</th>
                    <td className="px-3 py-2.5 font-mono text-xs sm:px-4 sm:text-sm">
                      application/json
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="mt-10 text-base font-semibold text-[#ECECEC]">Request body</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Core fields (TypeScript-style). Unknown <code className="rounded bg-zinc-900 px-1 py-0.5">mode</code>{' '}
              values fall back to <code className="rounded bg-zinc-900 px-1 py-0.5">better</code>.
            </p>
            <CodeBlock>{`{
  /** Input prompt (preferred) */
  text: string;
  /** Alias accepted for compatibility */
  prompt?: string;
  mode?: 'better' | 'specific' | 'cot' | 'developer' | 'research' | 'beginner' | 'product' | 'marketing';
  provider?: 'gemini' | 'openai' | 'anthropic';
  apiKey?: string;
  session_id?: string;
  version?: 'v1' | 'v2';
}`}</CodeBlock>

            <h3 className="mt-10 text-base font-semibold text-[#ECECEC]">Response body (200)</h3>
            <p className="mt-2 text-sm text-zinc-400">
              The API returns <code className="rounded bg-zinc-900 px-1 py-0.5">changes</code> as a{' '}
              <strong className="text-zinc-300">single string</strong>: newline-separated lines (each
              usually starts with <code className="rounded bg-zinc-900 px-1 py-0.5">&quot;- &quot;</code>
              ). Split on newlines if you need a list. Extra fields help with debugging and logging.
            </p>
            <CodeBlock>{`{
  optimizedText: string;
  explanation: string;
  /** Bullet-style lines joined with newlines (not a JSON array) */
  changes: string;
  rawText: string;
  provider: string;
  model: string;
}`}</CodeBlock>

            <h3 className="mt-10 text-base font-semibold text-[#ECECEC]">Errors</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-zinc-400">
              <li>
                <code className="rounded bg-zinc-900 px-1 py-0.5">400</code> —{' '}
                <code className="rounded bg-zinc-900 px-1 py-0.5">{`{ "error": "…" }`}</code> (missing
                prompt, invalid provider/key, etc.)
              </li>
              <li>
                <code className="rounded bg-zinc-900 px-1 py-0.5">500</code> —{' '}
                <code className="rounded bg-zinc-900 px-1 py-0.5">{`{ "error": "…" }`}</code> (model or
                upstream failure)
              </li>
            </ul>

            <h3 className="mt-10 text-base font-semibold text-[#ECECEC]">cURL</h3>
            <CodeBlock>{`curl -sS -X POST "${BASE}/api/optimize-sync" \\
  -H "Content-Type: application/json" \\
  -d '{
    "text": "Write me something about our product.",
    "mode": "better",
    "provider": "gemini"
  }'`}</CodeBlock>
            <p className="mt-2 text-xs text-zinc-500">With BYOK via header:</p>
            <CodeBlock>{`curl -sS -X POST "${BASE}/api/optimize-sync" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_GEMINI_OR_OPENAI_KEY" \\
  -d '{"text":"Summarize this email in 3 bullets.","mode":"specific","provider":"openai"}'`}</CodeBlock>

            <h3 className="mt-10 text-base font-semibold text-[#ECECEC]">JavaScript</h3>
            <CodeBlock>{`const res = await fetch(\`${BASE}/api/optimize-sync\`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    // Optional: 'Authorization': \`Bearer \${process.env.API_KEY}\`,
  },
  body: JSON.stringify({
    text: 'Explain async/await like I am new to JS.',
    mode: 'cot',
    provider: 'gemini',
  }),
});

if (!res.ok) {
  const err = await res.json().catch(() => ({}));
  throw new Error(err.error || res.statusText);
}

const data = await res.json();
console.log(data.optimizedText, data.explanation, data.changes);`}</CodeBlock>

            <h3 className="mt-10 text-base font-semibold text-[#ECECEC]">Python</h3>
            <CodeBlock>{`import requests

url = "${BASE}/api/optimize-sync"
payload = {
    "text": "Draft a polite follow-up email to a client who missed a call.",
    "mode": "better",
    "provider": "gemini",
}
headers = {"Content-Type": "application/json"}
# Optional BYOK:
# headers["Authorization"] = f"Bearer {api_key}"

r = requests.post(url, json=payload, headers=headers, timeout=120)
r.raise_for_status()
data = r.json()
print(data["optimizedText"])
print(data["explanation"])
print(data["changes"])`}</CodeBlock>
          </section>

          <section id="modes" className="scroll-mt-6">
            <SectionTitle id="modes-heading">Modes explained</SectionTitle>
            <p className="mt-4 text-sm text-zinc-400 sm:text-base">
              The <code className="rounded bg-zinc-900 px-1.5 py-0.5">mode</code> selects the system
              instructions sent to the model. These three are the ones called out in the product most
              often:
            </p>
            <ul className="mt-4 space-y-4 text-sm leading-relaxed text-zinc-300">
              <li className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
                <span className="font-mono text-[#4552FF]">better</span>
                <p className="mt-2 text-zinc-400">
                  General upgrade: clearer, more effective wording while keeping the user&apos;s intent.
                  Good default when you are not sure which lens to use.
                </p>
              </li>
              <li className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
                <span className="font-mono text-[#4552FF]">specific</span>
                <p className="mt-2 text-zinc-400">
                  Pushes for constraints, audience, format, success criteria, edge cases, and measurable
                  outcomes so the model has less room to guess.
                </p>
              </li>
              <li className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
                <span className="font-mono text-[#4552FF]">cot</span>
                <p className="mt-2 text-zinc-400">
                  Chain-of-thought style: encourages step-by-step reasoning, checking intermediate
                  steps, or &quot;think through X before Y&quot; without pointless bloat.
                </p>
              </li>
            </ul>
            <p className="mt-6 text-sm text-zinc-500">
              Additional modes on the same endpoint:{' '}
              <code className="rounded bg-zinc-900 px-1 py-0.5">developer</code>,{' '}
              <code className="rounded bg-zinc-900 px-1 py-0.5">research</code>,{' '}
              <code className="rounded bg-zinc-900 px-1 py-0.5">beginner</code>,{' '}
              <code className="rounded bg-zinc-900 px-1 py-0.5">product</code>,{' '}
              <code className="rounded bg-zinc-900 px-1 py-0.5">marketing</code> — each biases the
              rewrite toward that kind of work (see <code className="rounded bg-zinc-900 px-1 py-0.5">src/lib/prompts.ts</code>).
            </p>
          </section>

          <section id="rate-limits" className="scroll-mt-6">
            <SectionTitle id="rate-limits-heading">Rate limits</SectionTitle>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-zinc-400 sm:text-base">
              <p>
                This codebase does not enforce a custom requests-per-minute counter on{' '}
                <code className="rounded bg-zinc-900 px-1 py-0.5">/api/optimize-sync</code>. Throughput
                is bounded by your hosting platform and—most importantly—by the{' '}
                <strong className="text-zinc-300">LLM provider&apos;s quotas</strong> on the key in use.
              </p>
              <p>
                On a shared deployment, the default <strong className="text-zinc-300">Gemini</strong>{' '}
                path uses the server&apos;s API key: all users without BYOK share that quota. For steady
                traffic or production, use BYOK keys and monitor usage in Google AI Studio / OpenAI /
                Anthropic dashboards.
              </p>
            </div>
          </section>

          <section id="examples" className="scroll-mt-6">
            <SectionTitle id="examples-heading">Examples</SectionTitle>
            <p className="mt-4 text-sm text-zinc-400 sm:text-base">
              Illustrative before/after snippets (not live API output). They show the kind of rewrite
              each mode targets.
            </p>

            <article className="mt-8 space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-[#4552FF]">1 · mode: better</h3>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Before</p>
              <blockquote className="border-l-2 border-zinc-600 pl-3 text-sm italic text-zinc-400">
                write something for linkedin about our launch
              </blockquote>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">After (excerpt)</p>
              <blockquote className="border-l-2 border-[#4552FF]/60 pl-3 text-sm text-zinc-300">
                Draft a LinkedIn post announcing our product launch. Audience: professionals in [industry].
                Tone: confident and concise. Include: what we built, the problem it solves, one concrete
                outcome, and a single CTA (e.g. waitlist or demo). Under 200 words.
              </blockquote>
            </article>

            <article className="mt-8 space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-[#4552FF]">2 · mode: specific</h3>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Before</p>
              <blockquote className="border-l-2 border-zinc-600 pl-3 text-sm italic text-zinc-400">
                help me debug my app
              </blockquote>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">After (excerpt)</p>
              <blockquote className="border-l-2 border-[#4552FF]/60 pl-3 text-sm text-zinc-300">
                I have a bug in my app. Stack: [framework + version]. Symptom: [expected vs actual].
                Steps to reproduce: 1) … 2) … Relevant code (minimal): [paste]. Error logs / stack trace:
                [paste]. What I already tried: [list]. Please suggest the most likely root causes and
                ordered checks.
              </blockquote>
            </article>

            <article className="mt-8 space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-[#4552FF]">3 · mode: cot</h3>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Before</p>
              <blockquote className="border-l-2 border-zinc-600 pl-3 text-sm italic text-zinc-400">
                Is this pricing fair for a B2B SaaS?
              </blockquote>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">After (excerpt)</p>
              <blockquote className="border-l-2 border-[#4552FF]/60 pl-3 text-sm text-zinc-300">
                Evaluate whether this B2B SaaS pricing is reasonable. First, list the assumptions you need
                (ICP, ACV, competitors, value metric). Then reason step-by-step: compare to comparable
                tiers, note risks (churn, discounting, expansion). Finally, give a concise verdict with
                caveats and 2–3 concrete adjustments if needed.
              </blockquote>
            </article>
          </section>

          <section id="chrome-extension" className="scroll-mt-6 border-t border-zinc-800 pt-14">
            <SectionTitle id="chrome-extension-heading">Chrome extension</SectionTitle>
            <p className="mt-4 text-sm leading-relaxed text-zinc-400">
              The extension source lives under{' '}
              <code className="rounded bg-zinc-900 px-1.5 py-0.5 text-zinc-200">extension/</code> in the
              repo. To load locally: Chrome →{' '}
              <code className="rounded bg-zinc-900 px-1 py-0.5">chrome://extensions</code> → Developer
              mode → <strong className="text-zinc-300">Load unpacked</strong> → select that folder. Set
              the popup <strong className="text-zinc-300">API URL</strong> to your deployment or{' '}
              <code className="rounded bg-zinc-900 px-1 py-0.5">http://localhost:3000</code>.
            </p>
          </section>
        </div>

        <footer className="mt-16 border-t border-zinc-800 pt-8 text-center text-xs text-zinc-500">
          PromptPerfect API docs ·{' '}
          <Link href="/" className="text-[#4552FF] hover:underline">
            Home
          </Link>
        </footer>
      </div>
    </div>
  );
}
