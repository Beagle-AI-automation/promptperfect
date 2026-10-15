# PromptPerfect

> PromptPerfect is an open-source prompt optimization tool that automatically improves your LLM prompts and explains the changes.

<img width="1899" height="912" alt="image" src="https://github.com/user-attachments/assets/79d8f61d-aab4-4f0d-a81f-85c2de4d75b8" />
<img width="1902" height="890" alt="image" src="https://github.com/user-attachments/assets/f4af916b-ab2a-437f-8034-26e2c3c3e73e" />


PromptPerfect takes your draft prompts—whether vague, messy, or just a rough idea—and transforms them into high-quality, engineered prompts using AI. It doesn't just rewrite them; it teaches you *why* the changes were made, helping you become a better prompt engineer over time. Choose from modes like "Make it Better," "Make it Specific," or "Add Chain-of-Thought" to get exactly the result you need.

## Features

- **Instant Optimization**: Turn simple phrases into professional prompts in seconds.
- **Detailed Explanations**: Learn the "why" behind every change with educational breakdowns.
- **Multiple Modes**:
  - **Better**: General improvement for clarity and robustness.
  - **Specific**: Adds constraints and details to reduce hallucinations.
  - **Chain-of-Thought**: Structures the prompt to encourage step-by-step reasoning.
  - **Production Audit**: Link a project directory (analyzed locally in your browser, files stay on your device) and get the integral master prompt — everything that codebase needs to reach production-ready level.
- **Privacy-First**: Your API keys are stored locally in your browser and never saved to our servers.
- **Template Library**: 60 production-ready prompt templates across 60 categories (SaaS, Fintech, AI Agent, Legal, Security…) — fork any of them into the optimizer with one click. Works offline, no account needed.
- **Open Source**: Built with modern web technologies, free to use and extend.
- **n8n Integration**: Ready-to-import workflow templates for automation (see `examples/`).

## Tech Stack

| Component | Technology |
| :--- | :--- |
| **Framework** | Next.js 16.1.6 (App Router) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS + shadcn/ui |
| **AI Integration** | Vercel AI SDK |
| **Icons** | Lucide React |
| **Database** | Supabase (for analytics) |
| **Deployment** | Vercel |

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Client Layer                       │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Landing   │  │ App (Optimizer)│ │ Chrome Ext    │  │
│  │ Page      │  │ + Library     │  │ (any page)    │  │
│  └──────────┘  └──────┬───────┘  └───────┬───────┘  │
└────────────────────────┼─────────────────┼───────────┘
                         │                 │
┌────────────────────────┼─────────────────┼───────────┐
│                    API Layer              │           │
│  ┌──────────────┐  ┌──────────────┐  ┌───┴────────┐ │
│  │ /api/optimize │  │ /api/auth/*  │  │/api/optimize│ │
│  │ (streaming)   │  │ (login/signup│  │-sync (JSON) │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬─────┘ │
└─────────┼────────────────┼───────────────────┼───────┘
          │                │                   │
┌─────────┼────────────────┼───────────────────┼───────┐
│         │           Service Layer             │       │
│  ┌──────┴───────┐  ┌──────┴───────┐  ┌──────┴─────┐ │
│  │ lib/prompts   │  │ Supabase Auth │  │lib/providers││
│  │ (3 modes)     │  │              │  │(Gemini/OAI/ ││
│  └──────────────┘  └──────────────┘  │ Anthropic)  ││
│                                      └─────────────┘ │
│  ┌──────────────────────────────────────────────────┐│
│  │              Supabase (PostgreSQL)                ││
│  │  optimization_logs │ pp_optimization_history      ││
│  │  pp_user_profiles  │ pp_saved_prompts             ││
│  │  guest_usage       │ pp_users                     ││
│  └──────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────┘
```

## Getting Started

Follow these steps to run PromptPerfect locally on your machine.

### Prerequisites

- Node.js 22 (see `.nvmrc`; `engines` requires >=20.9.0)
- A Google Gemini API key (or OpenAI/Anthropic key for BYOK)

### Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/Beagle-AI-automation/promptperfect.git
    cd promptperfect
    ```

2.  **Install dependencies (locked install only):**

    ```bash
    npm ci
    ```

    > Plain `npm install` is known-broken upstream (`ai@6` pins a
    > `@ai-sdk/provider-utils` version missing from the registry) — always use
    > `npm ci` so the install matches `package-lock.json`.
    > See `docs/adr/0002-request-validation-without-zod.md`.

3.  **Configure environment variables:**

    Create a `.env.local` file in the root directory and add your API keys:

    Copy `.env.example` to `.env.local` and fill in your values:

    ```bash
    cp .env.example .env.local
    ```

    Key variables:

    | Variable | Required | Description |
    |---|---|---|
    | `GOOGLE_GENERATIVE_AI_API_KEY` | Yes | Gemini key — [Google AI Studio](https://aistudio.google.com/app/apikey) |
    | `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
    | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
    | `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service-role key (server-side only) |
    | `NEXT_PUBLIC_SITE_URL` | Yes (prod) | Deployment URL for OAuth redirects |
    | `ALLOWED_ORIGINS` | Yes | CORS origins for `/api/optimize-sync` |
    | `OPENAI_API_KEY` | No | OpenAI key (enables GPT provider) |
    | `ANTHROPIC_API_KEY` | No | Anthropic key (enables Claude provider) |
    | `DATABASE_URL` | No | Postgres URL for local Supabase migrations |

    See `.env.example` for comments and defaults.

4.  **Run the development server:**

    ```bash
    npm run dev
    ```

    Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

5.  **Verify your setup** (same gates CI runs on every PR):

    ```bash
    npm run typecheck   # strict TypeScript, zero errors
    npm run lint        # ESLint (Next.js core-web-vitals + TypeScript)
    npm run test:run    # vitest suite, colocated *.test.ts(x) files
    npm run build       # production build
    ```

### Useful commands

| Command | Purpose |
|---|---|
| `npm run dev` | Local dev server with Turbopack |
| `npm run test:coverage` | Test suite with V8 coverage report (`./coverage`) |
| `npm run db:migrate` | Apply `supabase/migrations/*.sql` (`DATABASE_URL` required) |
| `npm run db:verify` | 47 DB assertions: schema, CHECK enforcement, RLS, triggers |
| `npm run db:seed` | Idempotent local-dev fixtures (never on production) |
| `npm run db:check` | Exit 1 if migrations pending (pre-deploy gate) |
| `docker build -t promptperfect .` | Validate the production container (see `Dockerfile`) |

- **Browser extension:** load `extension/` unpacked via `chrome://extensions` (details in `extension/README.md`); it calls `/api/optimize-sync` with your own provider key (BYOK).
- **API validation:** new payload routes must extend the zero-dependency parsers in `src/lib/apiSchemas.ts` — no Zod (see `docs/adr/0002-request-validation-without-zod.md`).
- **Supabase clients:** browser code uses `@/lib/client/supabaseBrowser`, server code uses `@/lib/server/supabase` — never the reverse (see `docs/adr/0001-supabase-client-factories.md`).

## Integrations

### n8n Workflow Automation

PromptPerfect includes ready-to-import n8n workflow templates for automating prompt optimization in your workflows.

**Quick Start:**
1. Import `examples/n8n-optimize-prompt.json` into n8n
2. Configure your PromptPerfect URL
3. Start automating!

See `examples/README.md` for full documentation and advanced use cases.

## API

Base URL: your deployment (local: `http://localhost:3000`). Errors share one
envelope: `{ "error": "message" }` (+ `hint`/`code` on some routes).

### POST `/api/optimize` — streaming (Gemini)

```bash
curl -N -X POST http://localhost:3000/api/optimize \
  -H 'Content-Type: application/json' \
  -d '{"prompt": "Write a haiku about caching", "mode": "better"}'
```

Body: `prompt` (or `text`, max 100k chars), `mode`, optional `apiKey`
(BYOK Gemini key), optional `session_id` (for feedback linkage).
Streams `text/plain`. `400` on validation errors, `500` with a user-facing
message (quota/retired-model/key problems are mapped to actionable copy).

### POST `/api/optimize-sync` — JSON, multi-provider, extension-compatible

```bash
curl -X POST http://localhost:3000/api/optimize-sync \
  -H 'Content-Type: application/json' \
  -d '{"prompt": "...", "mode": "production", "provider": "openai"}'
```

Body adds `provider` (`gemini`|`openai`|`anthropic`), `apiKey` (or
`Authorization: Bearer`). Without a key you need a Supabase session —
except in local unlimited mode with a server key configured.
Returns `{ optimizedText, explanation, changes, rawText, provider, model }`.
CORS: allowlisted origins (`ALLOWED_ORIGINS`) + browser-extension schemes;
`OPTIONS` handled. Rate limit: 30 req/min per IP (disabled in unlimited mode).

### POST `/api/translate` — ES⇄EN

Body: `text` (max 50k chars), `targetLang` (`es`|`en`), optional
`provider`/`apiKey` (same auth gate as optimize-sync).
Returns `{ translatedText, targetLang, model }`. Code, `{{PLACEHOLDERS}}`,
markdown and `---EXPLANATION---` markers are preserved byte-identical.

### Modes & providers

Modes: `better` (default), `specific`, `cot`, `developer`, `research`,
`beginner`, `product`, `marketing`, `production`. Unknown modes fall back to
`better`. Providers default per `GEMINI_MODEL` (`gemini-3.5-flash`),
`OPENAI_MODEL` (`gpt-6-astra`, effort via `OPENAI_REASONING_EFFORT=high`),
Anthropic Haiku. Output always splits on `---EXPLANATION---` / `---CHANGES---`.

### Other routes

| Route | Purpose |
|---|---|
| `GET /api/config` | `{ providers, models, unlimited }` capability map (no secrets) |
| `GET/POST /api/guest-usage` | Anonymous quota tracking (`{guestId}`) |
| `POST /api/feedback` | Thumbs feedback linked by `sessionId` |
| `GET/POST/DELETE /api/saved-prompts` | Library CRUD (paginated: `?limit&offset` → `{prompts, nextOffset, total}`) |
| `POST /api/share/generate` | Share links for history rows (auth) |
| `GET /api/stats` | Usage aggregates (auth) |
| `POST /api/verify-key` | Validate a provider key (auth) |

## Deploy Your Own

You can deploy your own instance of PromptPerfect to Vercel with a single click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Beagle-AI-automation/promptperfect&env=GOOGLE_GENERATIVE_AI_API_KEY,NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY,NEXT_PUBLIC_SITE_URL&envDescription=See%20.env.example%20for%20details)

## Contributing

We welcome contributions—bug fixes, docs, and features are all appreciated. See **[CONTRIBUTING.md](CONTRIBUTING.md)** for local setup, branch naming (`PP-XXX/description`), commit format, PR expectations (`npx vitest run`, `npx tsc --noEmit`), and code style.

## FAQ

### What is PromptPerfect?

PromptPerfect is an open-source prompt optimization tool. Paste any LLM prompt, pick an optimization mode, and get an improved version with explanations of what changed and why. It runs in your browser — no install needed.

### What LLM providers does it work with?

PromptPerfect supports OpenAI (GPT-4, GPT-3.5), Anthropic (Claude), and Google (Gemini). You bring your own API key. The key is sent directly from your browser to the provider — it never touches our servers.

### Is my API key safe?

Yes. Your API key is sent from your browser directly to the LLM provider's API. It is not stored, logged, or transmitted to any other server. You can verify this in the source code — the API route proxies the request without persisting the key.

### How do I add a new optimization mode?

Add a new prompt string to [`src/lib/prompts.ts`](src/lib/prompts.ts) and a corresponding option in the [`AppModeSelector`](src/components/AppModeSelector.tsx) component. See [CONTRIBUTING.md](CONTRIBUTING.md) for conventions.

### How is this different from DSPy or PromptFoo?

DSPy is a framework for programmatic prompt optimization in Python pipelines. PromptFoo is a CLI tool for evaluating and testing prompts. PromptPerfect is a web-based tool for manually improving individual prompts with explanations — more like Grammarly for prompts than a testing framework.

### Can I deploy my own instance?

Yes. Click the "Deploy with Vercel" button in this README. You'll need a Gemini API key (free from ai.google.dev). The whole setup takes under 5 minutes.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Built by the <a href="https://github.com/Beagle-AI-automation">Beagle Builder Program</a>
</p>
