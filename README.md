PromptPerfect is a Next.js app that **rewrites prompts** into a clearer, more effective version and returns a short explanation of what changed.

## Getting Started

### Setup

1) Copy env file

```bash
cp .env.example .env
```

2) Add at least one server key (recommended):
- `GOOGLE_API_KEY` (Gemini)

Optional (for analytics logging from the browser):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3) If using Supabase:

   Run the migration in your Supabase project → SQL Editor (or `supabase db push`):

   ```sql
   -- See supabase/migrations/20250218000000_create_optimization_logs.sql
   ```

### Run dev server

```bash
npm run dev
```

Open `http://localhost:3000`.

## API

- **v2 streaming**: `POST /api/optimize`
  - Streams plain text output that contains:
    - optimized prompt text
    - delimiter `---EXPLANATION---`
    - bullet explanations
- **v1 sync fallback**: `POST /api/optimize-sync`
  - Returns JSON:
    - `optimizedText`
    - `explanation`
    - `rawText`

Both versions accept:

```json
{
  "prompt": "string",
  "mode": "developer | research | beginner | product | marketing",
  "provider": "google",
  "apiKey": "optional BYOK key",
  "model": "optional model override"
}
```

## Old + New versions

- The **new app** is on `/` (PromptPerfect UI).
- The original starter page is preserved at `/legacy`.

## Security / What to hide

- **Never commit**: `.env` (and any `.env*` files containing keys), API keys, tokens, service-role keys.
- **Never log**: `apiKey` from requests. (This app does not persist keys server-side.)
- **Safe to commit**: `.env.example` with empty values only.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
