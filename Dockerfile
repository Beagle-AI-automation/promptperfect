# PromptPerfect — production multi-stage image (Next.js standalone server).
# Build:  docker build -t promptperfect .
# Run:    docker run -p 3000:3000 --env-file .env.local promptperfect
# Env (.env.local, never baked in): GOOGLE_GENERATIVE_AI_API_KEY,
# NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SITE_URL, ALLOWED_ORIGINS.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# `npm ci` (locked) — plain `npm install` is known-broken upstream
# (ai@6 pins a provider-utils version missing from the registry).
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=builder /app/package.json /app/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/healthz > /dev/null || exit 1

CMD ["npm", "start", "--", "-p", "3000"]
