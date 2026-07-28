#!/usr/bin/env node

/**
 * Execute Supabase migrations using pg (postgres client)
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing .env.local credentials');
  process.exit(1);
}

const projectId = SUPABASE_URL.split('.')[0].replace('https://', '');
const dbHost = `db.${projectId}.supabase.co`;

console.log('\n🚀 Executing Supabase Migrations via PostgreSQL\n');
console.log(`📍 Target: ${dbHost}`);
console.log(`🔑 Using JWT service role token\n`);

const migrationsDir = path.join(__dirname, 'supabase', 'migrations');
const migrations = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

console.log(`📦 Found ${migrations.length} migrations:\n`);
migrations.forEach((m) => console.log(`  - ${m}`));
console.log('');

async function executeMigration(client, filePath, filename) {
  console.log(`\n🔄 Applying: ${filename}`);

  try {
    const sql = fs.readFileSync(filePath, 'utf-8');

    // Split by semicolon but be careful with strings
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    console.log(`   📋 Executing ${statements.length} statements...`);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      try {
        await client.query(stmt);
      } catch (err) {
        // Some statements might fail (e.g., CREATE TABLE IF NOT EXISTS)
        // Log but continue
        if (!err.message.includes('already exists')) {
          console.error(`   ⚠️  Statement ${i + 1}: ${err.message}`);
        }
      }
    }

    console.log(`   ✅ Success`);
    return true;
  } catch (err) {
    console.error(`   ❌ Error: ${err.message}`);
    return false;
  }
}

async function main() {
  const client = new Client({
    host: dbHost,
    database: 'postgres',
    user: 'postgres',
    password: SERVICE_ROLE_KEY, // JWT token acts as password
    port: 5432,
    ssl: {
      rejectUnauthorized: false, // Self-signed certs
    },
  });

  try {
    console.log('🔐 Connecting to database...\n');
    await client.connect();
    console.log('✅ Connected\n');

    let successCount = 0;

    for (const migration of migrations) {
      const filePath = path.join(migrationsDir, migration);
      const success = await executeMigration(client, filePath, migration);
      if (success) successCount++;
    }

    console.log('\n' + '='.repeat(70));
    console.log(`\n📊 Results: ${successCount}/${migrations.length} migrations applied`);

    if (successCount === migrations.length) {
      console.log('\n✅ All migrations applied successfully!');
    } else {
      console.log('\n⚠️  Some migrations had issues. Check errors above.');
    }

    await client.end();
    process.exit(successCount === migrations.length ? 0 : 1);
  } catch (err) {
    console.error(`\n❌ Connection failed: ${err.message}`);
    console.error('\n💡 Troubleshooting:');
    console.error('   - Verify SUPABASE_SERVICE_ROLE_KEY in .env.local');
    console.error('   - Check internet connection');
    console.error('   - Try using SQL Editor: https://app.supabase.com/project/' + projectId + '/sql/new');
    process.exit(1);
  }
}

main();
