/**
 * Database Migration Script
 * Run this to create the pp_optimization_history table for the share feature
 * 
 * Usage: node supabase/migrate.js
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase credentials in .env file');
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const migrationSQL = `
-- Create pp_optimization_history table for storing optimization results
CREATE TABLE IF NOT EXISTS pp_optimization_history (
  id uuid default gen_random_uuid() primary key,
  session_id text not null,
  prompt_original text not null,
  prompt_optimized text not null,
  mode text not null,
  explanation text default '',
  share_id text unique,
  created_at timestamptz default now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_pp_optimization_history_session_id 
  ON pp_optimization_history(session_id);

CREATE INDEX IF NOT EXISTS idx_pp_optimization_history_share_id 
  ON pp_optimization_history(share_id) WHERE share_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pp_optimization_history_created_at 
  ON pp_optimization_history(created_at DESC);
`;

async function runMigration() {
  console.log('🚀 Starting database migration...\n');
  console.log('📋 Creating pp_optimization_history table...');
  
  try {
    // Use Supabase's SQL query endpoint via REST API
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ query: migrationSQL }),
    });

    // If the RPC method doesn't exist, try direct SQL execution
    if (!response.ok) {
      console.log('⚠️  RPC method not available, trying alternative approach...\n');
      
      // Alternative: Use the Supabase client to verify table creation
      const { data, error } = await supabase
        .from('pp_optimization_history')
        .select('id')
        .limit(1);
      
      if (error && error.message.includes('relation "pp_optimization_history" does not exist')) {
        console.error('❌ Error: Could not create table automatically.\n');
        console.log('📝 Please run the migration manually:');
        console.log('\n1. Go to your Supabase Dashboard:');
        console.log(`   ${supabaseUrl.replace('/rest/v1', '')}`);
        console.log('\n2. Navigate to: SQL Editor → New query');
        console.log('\n3. Copy and paste the SQL from:');
        console.log('   supabase/SETUP_SHARE_FEATURE.sql');
        console.log('\n4. Click "Run" to execute the migration\n');
        process.exit(1);
      }
      
      console.log('✅ Table already exists or was created successfully!\n');
    } else {
      console.log('✅ Migration completed successfully!\n');
    }

    // Verify the table was created
    console.log('🔍 Verifying table structure...');
    const { error: verifyError } = await supabase
      .from('pp_optimization_history')
      .select('id')
      .limit(0);
    
    if (verifyError) {
      console.error('⚠️  Warning: Could not verify table:', verifyError.message);
      console.log('\n📝 Please verify manually in Supabase Dashboard\n');
    } else {
      console.log('✅ Table verified successfully!\n');
      console.log('🎉 Migration complete! You can now use the share feature.\n');
      console.log('💡 Try optimizing a prompt - the Share button will appear after completion.\n');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n📝 Manual Migration Instructions:');
    console.log('\n1. Go to your Supabase Dashboard:');
    console.log(`   ${supabaseUrl.replace('/rest/v1', '')}`);
    console.log('\n2. Navigate to: SQL Editor → New query');
    console.log('\n3. Copy and paste the SQL from:');
    console.log('   supabase/SETUP_SHARE_FEATURE.sql');
    console.log('\n4. Click "Run" to execute the migration\n');
    process.exit(1);
  }
}

runMigration();
