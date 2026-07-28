#!/usr/bin/env node

/**
 * Apply Supabase migrations using REST API
 * Usage: node apply-migrations.js
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('  SUPABASE_SERVICE_ROLE_KEY:', SERVICE_ROLE_KEY ? '✓' : '✗');
  process.exit(1);
}

const migrationsDir = path.join(__dirname, 'supabase', 'migrations');
const migrations = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

console.log(`📦 Found ${migrations.length} migrations:\n`);
migrations.forEach((m) => console.log(`  - ${m}`));

async function executeMigration(filename) {
  const filePath = path.join(migrationsDir, filename);
  const sql = fs.readFileSync(filePath, 'utf-8');

  console.log(`\n🔄 Applying: ${filename}...`);

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/execute_sql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({ query: sql }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error(`   ❌ Error: ${result.message || result.error_description}`);
      return false;
    }

    console.log(`   ✅ Success`);
    return true;
  } catch (error) {
    console.error(`   ❌ Network error: ${error.message}`);
    return false;
  }
}

async function executeDirectSQL(sql) {
  // Alternative approach: use postgres directly
  // This requires psql to be installed
  const tempFile = path.join(__dirname, '.temp_migration.sql');
  fs.writeFileSync(tempFile, sql, 'utf-8');

  const { exec } = require('child_process');
  const psqlConnection = `postgresql://postgres:${process.env.DB_PASSWORD}@db.jcnxinvycgluoeqixdul.supabase.co:5432/postgres`;

  return new Promise((resolve) => {
    exec(`psql "${psqlConnection}" -f ${tempFile}`, (error, stdout, stderr) => {
      fs.unlinkSync(tempFile);
      if (error) {
        console.error('  Error:', stderr);
        resolve(false);
      } else {
        console.log('  ✅ Success');
        resolve(true);
      }
    });
  });
}

async function main() {
  console.log('\n🚀 Applying Supabase migrations...\n');
  console.log(`📍 Target: ${SUPABASE_URL}`);
  console.log(`🔐 Using service role key (masked)\n`);

  let successCount = 0;
  let failureCount = 0;

  for (const migration of migrations) {
    const success = await executeMigration(migration);
    if (success) {
      successCount++;
    } else {
      failureCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`📊 Results: ${successCount} succeeded, ${failureCount} failed`);

  if (failureCount > 0) {
    console.log('\n⚠️  Note: The REST API endpoint may not support SQL execution.');
    console.log('   Alternative: Use Supabase SQL Editor manually at:');
    console.log(`   https://app.supabase.com/project/${SUPABASE_URL.split('.')[0].replace('https://', '')}/sql`);
    console.log('\n   Or install psql and run:');
    console.log(`   psql -h db.jcnxinvycgluoeqixdul.supabase.co -U postgres < supabase/migrations/20260728093600_add_missing_tables.sql`);
  } else {
    console.log('\n✅ All migrations applied successfully!');
  }

  process.exit(failureCount > 0 ? 1 : 0);
}

main();
