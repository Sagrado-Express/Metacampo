#!/usr/bin/env node

/**
 * Execute Supabase migrations using supabase-js SDK
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SERVICE_ROLE_KEY ? '✓' : '✗');
  process.exit(1);
}

// Create Supabase client with admin key
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  db: { schema: 'public' },
});

async function executeMigration(filePath: string, filename: string) {
  console.log(`\n🔄 Applying: ${filename}...`);

  try {
    const sql = fs.readFileSync(filePath, 'utf-8');

    // Execute SQL via Supabase RPC or direct query
    // Note: This uses the admin client which has full permissions
    const { data, error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
      console.error(`   ❌ Error: ${error.message}`);
      return false;
    }

    console.log(`   ✅ Success`);
    return true;
  } catch (err: any) {
    console.error(`   ❌ Error: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('\n🚀 Applying Supabase migrations...\n');
  console.log(`📍 Target: ${SUPABASE_URL.split('.')[0]}`);

  const migrationsDir = path.join(__dirname, 'supabase', 'migrations');

  if (!fs.existsSync(migrationsDir)) {
    console.error(`❌ Migrations directory not found: ${migrationsDir}`);
    process.exit(1);
  }

  const migrations = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  console.log(`\n📦 Found ${migrations.length} migrations:\n`);
  migrations.forEach((m) => console.log(`  - ${m}`));

  let successCount = 0;
  let failureCount = 0;

  for (const migration of migrations) {
    const filePath = path.join(migrationsDir, migration);
    const success = await executeMigration(filePath, migration);
    if (success) {
      successCount++;
    } else {
      failureCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`📊 Results: ${successCount} succeeded, ${failureCount} failed`);

  if (failureCount > 0) {
    console.log('\n⚠️  Note: Some migrations failed.');
    console.log('   Check the errors above and run again.');
    console.log('\n   Alternative: Use Supabase SQL Editor at:');
    const projectRef = SUPABASE_URL.split('.')[0].replace('https://', '');
    console.log(`   https://app.supabase.com/project/${projectRef}/sql`);
  } else {
    console.log('\n✅ All migrations applied successfully!');
  }

  process.exit(failureCount > 0 ? 1 : 0);
}

main();
