# PromptPerfect — Deployment Runbook

Containerized production deploys (`Dockerfile` + `docker-compose.yml`) and the
managed-platform (Vercel) path. Supabase is SaaS — there is no database
container to run.

## 1. Prerequisites

| Item | Where |
|---|---|
| Supabase project (Auth + Postgres) | Dashboard |
| Google AI key (`GOOGLE_GENERATIVE_AI_API_KEY`) | AI Studio |
| Supabase redirect URLs: `<origin>/auth/callback`, `<origin>/auth/reset` | Auth → URL Configuration |
| Google OAuth client (optional): redirect `https://<ref>.supabase.co/auth/v1/callback` | Google Cloud Console |
| `.env.local` filled from `.env.example` | Repo root (never committed) |

Minimum production env: `GOOGLE_GENERATIVE_AI_API_KEY`,
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`, `ALLOWED_ORIGINS`.
Keep `NEXT_PUBLIC_UNLIMITED_MODE` **unset** (it disables quota, rate limits,
and auth gates).

## 2. Database — migrate, then verify (every deploy)

```bash
export DATABASE_URL='postgresql://postgres:<pw>@db.<ref>.supabase.co:5432/postgres'
node supabase/migrate.js          # applies pending files in lexical order
node supabase/migrate.js --check  # idempotency gate — must print "up to date"
node supabase/tests/verify.js     # 47 checks: tables, RLS, CHECKs, indexes,
                                  # triggers, negative probes, signup workflow
```

Rules (`docs/adr/0004-migration-strategy.md`): additive/idempotent SQL only,
new timestamped files in `supabase/migrations/`, never edit applied files
(except defensive no-op guards, as in PP-1014-D). CI (`db.yml`) runs the same
pipeline against Postgres 16 on every `supabase/**` change.

Rollback: migrations are expand-only, so rollback = redeploy the previous app
image. If a migration must be undone, ship a new compensating migration —
never `DROP` in place.

## 3. Build & release (Docker)

```bash
docker build -t promptperfect:<sha> .
docker run --env-file .env.local -p 3000:3000 promptperfect:<sha>
# or
docker compose up -d --build
```

Health: `GET /` must return 200 within the `HEALTHCHECK` window
(30 s interval, 3 retries). CI builds the image on every `main` push
(`ci.yml` → `docker` job) without pushing.

Vercel path: `npm ci && npm run build`; set the same env vars in the project
settings. `VERCEL_URL` is honored as redirect-host fallback automatically.

## 4. Pre-deploy gates (all must pass)

```bash
npm run typecheck          # strict + noUncheckedIndexedAccess + noUnusedLocals/Params
npm run lint
npm run test:run           # full Vitest suite
npm run test:coverage:core # ≥85% lines / ≥80% branches / ≥90% funcs on src/lib + auth
npm run build
```

## 5. Observability

- **API timing:** hot paths (`optimize`, `optimize-sync`, `translate`,
  `guest-usage`) emit JSON lines via `logApi(route, { status, ms, … })`
  (`src/lib/logger.ts`); `x-request-id` from `src/proxy.ts` correlates.
- **DB health (read-only):** run `supabase/tests/monitoring.sql` for slow
  queries, lock waits, pool saturation, table sizes, and the RLS inventory.
- **Product dashboard:** `src/app/control-room/page.tsx` (latency + usage).
- **Alerts:** watch 5xx rate on `/api/optimize*` and 429 spikes (in-memory
  limiter resets per instance — see PP-703-I; upgrade to Upstash Redis for
  multi-instance fleets).

## 6. Secret boundaries

- User BYOK keys live in browser `localStorage` (`promptperfect:apikey`) and
  travel only in request bodies to the provider-calling routes; they are never
  written to app tables except `pp_users.api_key` via authenticated
  `/api/auth/update-user` (scoped write, never logged or echoed).
- `SUPABASE_SERVICE_ROLE_KEY` is server-only. If leaked: rotate in the
  Supabase dashboard, update deploy env, redeploy.

## 7. Local parity

```bash
cp .env.example .env.local   # fill Supabase + Gemini keys
npm ci && npm run dev        # http://localhost:3000
# Supabase-less local mode:
# NEXT_PUBLIC_UNLIMITED_MODE=true npm run dev
```
