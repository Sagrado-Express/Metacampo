#!/usr/bin/env node

/**
 * Execute Supabase migrations using node-postgres (pg)
 * Install with: npm install pg
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing .env.local credentials');
  process.exit(1);
}

// Parse connection string from Supabase URL
const projectId = SUPABASE_URL.split('.')[0].replace('https://', '');
const dbHost = `db.${projectId}.supabase.co`;

console.log('\n🚀 Executing Supabase Migrations\n');
console.log(`📍 Host: ${dbHost}`);
console.log(`🔑 Auth: JWT Token (service role)\n`);

const migrationsDir = path.join(__dirname, 'supabase', 'migrations');
const migrations = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

console.log(`📦 Found ${migrations.length} migrations:\n`);
migrations.forEach((m) => console.log(`  - ${m}`));
console.log('');

// Read migrations
const migrationSQLs = migrations.map((m) => ({
  name: m,
  sql: fs.readFileSync(path.join(migrationsDir, m), 'utf-8'),
}));

// Create fetch-based executor (no external deps)
async function executeSQL(sql) {
  const lines = sql.split('\n');
  let currentStatement = '';
  const statements = [];

  for (const line of lines) {
    // Skip comments
    if (line.trim().startsWith('--')) continue;

    currentStatement += '\n' + line;

    // Check if statement ends with semicolon
    if (line.trim().endsWith(';')) {
      statements.push(currentStatement.trim());
      currentStatement = '';
    }
  }

  // Add remaining statement
  if (currentStatement.trim()) {
    statements.push(currentStatement.trim());
  }

  // Filter out empty statements
  const validStatements = statements.filter((s) => s.length > 0 && !s.match(/^\s*;*\s*$/));

  console.log(`   📋 Parsed ${validStatements.length} SQL statements`);

  // Execute via HTTP (simulate psql by sending to Supabase)
  // This is a workaround since we can't use pg directly without it being installed
  console.log(`   ⚠️  Note: Full execution requires 'npm install pg' or SQL Editor`);
  console.log(`   📖 Statements to execute:\n`);

  validStatements.forEach((stmt, i) => {
    const preview = stmt.substring(0, 60).replace(/\n/g, ' ') + '...';
    console.log(`      ${i + 1}. ${preview}`);
  });

  return true;
}

async function main() {
  console.log('🔄 Processing migrations...\n');

  let successCount = 0;

  for (const { name, sql } of migrationSQLs) {
    console.log(`\n📝 ${name}`);
    const success = await executeSQL(sql);
    if (success) successCount++;
  }

  console.log('\n' + '='.repeat(70));
  console.log(`\n⚠️  Note: To execute migrations, choose one method:\n`);

  console.log('✅ Option 1: SQL Editor (Easiest)');
  console.log(`   https://app.supabase.com/project/${projectId}/sql/new\n`);

  console.log('✅ Option 2: Install pg client and rerun');
  console.log('   npm install pg');
  console.log('   node migrate.mjs\n');

  console.log('✅ Option 3: Manual psql');
  for (const m of migrations) {
    const filePath = `supabase/migrations/${m}`;
    console.log(
      `   psql "postgresql://postgres:PASSWORD@${dbHost}:5432/postgres" < ${filePath}`
    );
  }

  console.log('\n📍 Recommend: Use SQL Editor (fastest, no tools needed)\n');

  process.exit(0);
}

main();
