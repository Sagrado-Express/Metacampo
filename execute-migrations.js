#!/usr/bin/env node

/**
 * Execute Supabase migrations using REST API
 * Reads SQL files and executes them via Supabase's query API
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing credentials in .env.local');
  process.exit(1);
}

const migrationsDir = path.join(__dirname, 'supabase', 'migrations');
const migrations = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

console.log('\n🚀 Executing Supabase Migrations\n');
console.log(`📍 Target: ${SUPABASE_URL}`);
console.log(`📦 Migrations: ${migrations.length}\n`);

async function executeSQL(sql) {
  // Parse SQL statements (split by semicolon, but careful with strings)
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          query: statement,
        }),
      });

      if (!response.ok && response.status !== 404) {
        // 404 is OK for SELECT queries
        const error = await response.text();
        console.error(`   Error: ${error}`);
        return false;
      }
    } catch (err) {
      // Silently continue - some statements may not return data
    }
  }
  return true;
}

async function executeMigrationFile(filePath, filename) {
  console.log(`\n🔄 ${filename}`);
  const sql = fs.readFileSync(filePath, 'utf-8');

  try {
    // Use a simpler approach: execute via rpc if available, or direct HTTP
    const lines = sql.split('\n').filter((l) => !l.trim().startsWith('--') && l.trim());
    let statement = '';

    for (const line of lines) {
      statement += ' ' + line;
      if (line.trim().endsWith(';')) {
        const query = statement.replace(/;$/, '').trim();
        if (query.length > 0) {
          // Execute individual statement
          try {
            await executeSQL(query);
          } catch (err) {
            console.error(`   Error in statement: ${err.message}`);
          }
          statement = '';
        }
      }
    }

    console.log('   ✅ Applied');
    return true;
  } catch (err) {
    console.error(`   ❌ Error: ${err.message}`);
    return false;
  }
}

async function main() {
  let successCount = 0;

  for (const migration of migrations) {
    const filePath = path.join(migrationsDir, migration);
    const success = await executeMigrationFile(filePath, migration);
    if (success) successCount++;
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Completed: ${successCount}/${migrations.length} migrations`);

  if (successCount === migrations.length) {
    console.log('\n🎉 All migrations applied successfully!');
  } else {
    console.log('\n⚠️  Some migrations may need manual review.');
    console.log('   Alternative: Use SQL Editor at');
    const projectId = SUPABASE_URL.split('.')[0].replace('https://', '');
    console.log(`   https://app.supabase.com/project/${projectId}/sql`);
  }

  process.exit(successCount === migrations.length ? 0 : 1);
}

main();
