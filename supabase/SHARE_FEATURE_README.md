# Share Feature Setup

## Quick Start (Automated)

Run this single command to set up the database:

```bash
npm run db:migrate
```

This will automatically create the `pp_optimization_history` table with all necessary indexes.

## What This Does

The migration creates:
- `pp_optimization_history` table for storing optimizations
- `share_id` column for generating shareable URLs
- Indexes for fast queries on `session_id`, `share_id`, and `created_at`

## Prerequisites

Make sure your `.env` file has these variables:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_role_key
```

## Manual Setup (Alternative)

If the automated script doesn't work, you can run the migration manually:

1. Go to your Supabase Dashboard SQL Editor
2. Run the SQL from `supabase/SETUP_SHARE_FEATURE.sql`

## Testing the Share Feature

1. Start the dev server: `npm run dev`
2. Go to http://localhost:3000
3. Enter a prompt and click "Optimize"
4. After optimization completes, you should see a **Share** button
5. Click it to generate a shareable URL
6. Visit the URL in a private/incognito window to see the public view

## Troubleshooting

**Share button not appearing?**
- Make sure the migration ran successfully
- Check that your Supabase credentials are correct in `.env`
- Try running `npm run db:migrate` again

**Migration failed?**
- Verify your `SUPABASE_SERVICE_KEY` (service_role key, not anon key)
- Check that your Supabase project is accessible
- Try the manual setup method above

## How It Works

1. When an optimization completes, it's saved to `pp_optimization_history`
2. The Share button appears with the saved `historyId`
3. Clicking Share generates a unique 10-character `share_id`
4. The share URL format: `yoursite.com/s/{share_id}`
5. Anyone with the link can view the optimization (read-only)
