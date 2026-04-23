# Contributing to PromptPerfect

Thanks for your interest in contributing to PromptPerfect! This guide will help you get started.

## Setup

1. Clone the repo: `git clone https://github.com/Beagle-AI-automation/promptperfect.git`
2. Install dependencies: `npm install`
3. Copy environment variables: `cp .env.example .env.local` and fill in values (see `.env.example` for required keys)
4. Start dev server: `npm run dev`
5. Open http://localhost:3000

## Branch Naming

```
{TICKET-ID}/{short-description}
Examples: PP-501/ci-cd, PP-505/prompt-library
```

## Commit Messages

```
type(TICKET-ID): short description

Examples:
feat(PP-505): add prompt library page with search and filters
fix(PP-501): update docs placeholder URL to production
test(PP-508): add API route integration tests
```

## Pull Requests

- One ticket = one branch = one PR
- PR title: `feat(PP-5XX): Short description`
- Include "How to Test" section in PR description
- All tests must pass (`npx vitest run`)
- No TypeScript errors (`npx tsc --noEmit`)

## Code Style

- TypeScript strict mode
- Functional components with hooks
- Named exports (no default exports except pages)
- `'use client'` only when component needs browser APIs
- Files under 150 lines
- Early returns for error handling

## Tech Stack

- Next.js 16.1.6 (App Router)
- TypeScript 5.9.3
- Tailwind CSS 4
- Vercel AI SDK (streaming)
- Supabase (auth, database)
- Vitest (testing)

## Share links & database migrations

Saving optimizations and shareable URLs require Supabase and the `pp_optimization_history` table.

**Environment:** Use the Supabase variables in `.env.example` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`). For OAuth redirects, set `NEXT_PUBLIC_SITE_URL`. For running migrations locally against Postgres, optional `DATABASE_URL` is documented in `.env.example`.

**Apply migrations:**

```bash
npm run db:migrate
```

That runs `supabase/migrate.js` and creates the tables the app expects (including optimization history used by Share).

**Further reading:**

- [`docs/SHARE_FEATURE_IMPLEMENTATION.md`](docs/SHARE_FEATURE_IMPLEMENTATION.md) — implementation overview and file map
- [`docs/TEST_SHARE_FEATURE.md`](docs/TEST_SHARE_FEATURE.md) — manual QA steps for Share
- [`supabase/SHARE_FEATURE_README.md`](supabase/SHARE_FEATURE_README.md) — migration and manual SQL fallback

**Deployment:** Configure the same env vars on Vercel (or your host). After deploy you can run `npm run db:migrate` locally with production credentials pulled via `vercel env pull`, or run the SQL from `supabase/SETUP_SHARE_FEATURE.sql` in the Supabase SQL Editor.

**If migration fails:** Confirm the service role key (not the anon key), URL/reachability to Supabase, and credentials in `.env.local`.
