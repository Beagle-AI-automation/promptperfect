# Share Feature - Developer Setup Guide

## 🚀 One-Command Setup

Anyone can set up the share feature with a single command:

```bash
npm run db:migrate
```

That's it! This automatically creates the required database table.

## 📋 Prerequisites

Just need Supabase credentials in your `.env` file:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here
GOOGLE_API_KEY=your_google_api_key
```

## 🎯 What You Get

After setup, users can:
1. Complete a prompt optimization
2. Click the **Share** button that appears
3. Get a shareable URL like: `yoursite.com/s/abc123xyz`
4. Anyone with the link can view the optimization (read-only)

## 📁 Files Added

### Database
- `supabase/migrate.js` - Automated migration script
- `supabase/migrations/20250321000000_create_optimization_history.sql` - SQL schema
- `supabase/SETUP_SHARE_FEATURE.sql` - Manual setup SQL
- `supabase/SHARE_FEATURE_README.md` - Setup documentation

### Components
- `src/components/ShareButton.tsx` - Share button with copy-to-clipboard
- `src/app/s/[shareId]/page.tsx` - Public share view page

### API
- `src/app/api/share/generate/route.ts` - Share URL generation endpoint

### Updated Files
- `src/hooks/useOptimizePrompt.ts` - Added historyId tracking
- `src/lib/client/optimizationHistory.ts` - Returns ID when saving
- `src/components/PromptPerfectOutputs.tsx` - Integrated ShareButton
- `src/components/PromptPerfectApp.tsx` - Passes historyId to outputs
- `package.json` - Added `db:migrate` script and `nanoid` dependency

## 🔧 For Other Developers

When someone else clones the repo:

1. Copy `.env.example` to `.env` (or get credentials from team)
2. Run `npm install`
3. Run `npm run db:migrate`
4. Run `npm run dev`
5. Test by optimizing a prompt - Share button should appear!

## 🏗️ Architecture

### Flow:
```
User optimizes prompt
  → Saved to pp_optimization_history table
  → Returns historyId
  → Share button appears
  → Click Share
  → Generates nanoid (10 chars)
  → Updates share_id in database
  → Returns shareable URL
  → Copy to clipboard
```

### Share URL Route:
```
/s/[shareId] (Server Component)
  → Fetches from pp_optimization_history by share_id
  → Renders read-only view
  → SEO-friendly (server-rendered)
```

## 🌐 Production Deployment

Works on Vercel out of the box:

1. Push to GitHub
2. Import to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy
5. Run migration: `vercel env pull && npm run db:migrate`

Or run the migration in Vercel's terminal after first deploy.

## 📊 Database Schema

```sql
CREATE TABLE pp_optimization_history (
  id uuid PRIMARY KEY,
  session_id text NOT NULL,
  prompt_original text NOT NULL,
  prompt_optimized text NOT NULL,
  mode text NOT NULL,
  explanation text DEFAULT '',
  share_id text UNIQUE,  -- ← Added for sharing
  created_at timestamptz DEFAULT now()
);
```

## 🎨 UI/UX

**Share Button Location:**
- Appears after optimization completes
- Positioned below output cards
- Next to thumbs up/down feedback buttons
- Shows "Share" → "Copied!" confirmation

**Share Page:**
- Dark theme matching main app
- Read-only cards for original/optimized prompts
- Copy button on optimized prompt
- CTA to try PromptPerfect
- Beautiful gradient styling

## 🧪 Testing

See `TEST_SHARE_FEATURE.md` for detailed testing steps.

Quick test:
1. Optimize a prompt
2. Click Share button
3. Open URL in incognito window
4. Verify everything displays correctly

## 📞 Support

If migration fails, check:
- Supabase credentials are correct
- Service role key (not anon key)
- Network connectivity to Supabase

Can always run SQL manually in Supabase Dashboard as fallback.
