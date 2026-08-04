#!/usr/bin/env node
/**
 * Cria os dois usuários/tenants de teste (documentados no CLAUDE.md) e povoa
 * dados distintos em cada um. É o fixture que test_rls_dashboard.js depende
 * para provar isolamento — sem dados assimétricos entre os tenants, um bug
 * de RLS pode passar despercebido porque os dois "veem tudo igual" mesmo
 * quando o isolamento está quebrado.
 *
 * Idempotente: remove e recria os usuários e as linhas dos dois tenants de
 * teste a cada execução.
 *
 * Uso: npm run seed:test
 */
const fs = require('fs');
const raw = fs.readFileSync('.env.local', 'utf-8');
const env = (k) => {
  const m = raw.match(new RegExp('^' + k + '="?([^"\\n]+)"?', 'm'));
  return m ? m[1] : null;
};
const U = env('NEXT_PUBLIC_SUPABASE_URL');
const S = env('SUPABASE_SERVICE_ROLE_KEY');

if (!U || !S) {
  console.error('Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY em .env.local');
  process.exit(1);
}

const H = { apikey: S, Authorization: `Bearer ${S}`, 'Content-Type': 'application/json' };

const TA = '11111111-1111-1111-1111-111111111111';
const TB = '22222222-2222-2222-2222-222222222222';

const USERS = [
  { email: 'teste1@metacampo.com', password: 'Teste123!@#', tenant: TA, label: 'Tenant A' },
  { email: 'teste2@metacampo.com', password: 'Teste123!@#', tenant: TB, label: 'Tenant B' },
];

async function upsertUser(u) {
  const list = await (await fetch(`${U}/auth/v1/admin/users?per_page=200`, { headers: H })).json();
  const existing = (list.users || []).find((x) => x.email === u.email);
  if (existing) {
    await fetch(`${U}/auth/v1/admin/users/${existing.id}`, { method: 'DELETE', headers: H });
  }
  const res = await fetch(`${U}/auth/v1/admin/users`, {
    method: 'POST',
    headers: H,
    body: JSON.stringify({
      email: u.email,
      password: u.password,
      email_confirm: true,
      app_metadata: { tenant_id: u.tenant, role: 'admin' },
      user_metadata: { full_name: u.label },
    }),
  });
  if (!res.ok) throw new Error(`criar ${u.email}: ${res.status} ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

async function post(table, rows) {
  const res = await fetch(`${U}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...H, Prefer: 'return=representation' },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`insert ${table}: ${res.status} ${(await res.text()).slice(0, 250)}`);
  return res.json();
}

async function wipe(table) {
  await fetch(`${U}/rest/v1/${table}?tenant_id=in.(${TA},${TB})`, { method: 'DELETE', headers: H });
}

(async () => {
  console.log('=== 1. USUÁRIOS ===\n');
  for (const u of USERS) {
    const created = await upsertUser(u);
    console.log(`  ${u.email} -> tenant_id=${created.app_metadata?.tenant_id}`);
    await post('user_tenants', [{ user_id: created.id, tenant_id: u.tenant, role: 'admin' }]).catch(() => {});
  }

  console.log('\n=== 2. LIMPANDO DADOS ANTERIORES DOS TENANTS DE TESTE ===\n');
  for (const t of ['customer_crop_areas', 'clientes', 'grupos_economicos', 'it_se_configurations', 'tenant_config_culturas', 'tenant_config_classificacoes']) {
    await wipe(t);
    console.log(`  limpo: ${t}`);
  }

  console.log('\n=== 3. SEED (assimétrico de propósito — A tem mais que B) ===\n');

  const cult = await post('tenant_config_culturas', [
    { tenant_id: TA, custom_name: 'Soja', internal_key: 'SOJA', display_order: 0, is_active: true },
    { tenant_id: TA, custom_name: 'Milho', internal_key: 'MILHO', display_order: 1, is_active: true },
    { tenant_id: TB, custom_name: 'Algodao', internal_key: 'ALGODAO', display_order: 0, is_active: true },
  ]);
  console.log(`  tenant_config_culturas: ${cult.length} linhas (A=2, B=1)`);

  const clas = await post('tenant_config_classificacoes', [
    { tenant_id: TA, custom_name: 'Sementes', internal_key: 'SEMENTES', display_order: 0, is_active: true, parent_key: null },
    { tenant_id: TA, custom_name: 'Fertilizantes', internal_key: 'FERTILIZANTES', display_order: 1, is_active: true, parent_key: null },
    { tenant_id: TB, custom_name: 'Defensivos', internal_key: 'DEFENSIVOS', display_order: 0, is_active: true, parent_key: null },
  ]);
  console.log(`  tenant_config_classificacoes: ${clas.length} linhas (A=2, B=1)`);

  const cli = await post('clientes', [
    { tenant_id: TA, ctv_id: 'ctv-a-001', name: 'Fazenda Santa Rita (A)', document: 'DOC-A-1', city: 'Sorriso', state: 'MT', region: 'Centro-Oeste' },
    { tenant_id: TA, ctv_id: 'ctv-a-001', name: 'Fazenda Boa Vista (A)', document: 'DOC-A-2', city: 'Sinop', state: 'MT', region: 'Centro-Oeste' },
    { tenant_id: TA, ctv_id: 'ctv-a-001', name: 'Agropecuaria Horizonte (A)', document: 'DOC-A-3', city: 'Lucas do Rio Verde', state: 'MT', region: 'Centro-Oeste' },
    { tenant_id: TB, ctv_id: 'ctv-b-001', name: 'Fazenda Uniao (B)', document: 'DOC-B-1', city: 'Barreiras', state: 'BA', region: 'Nordeste' },
  ]);
  console.log(`  clientes: ${cli.length} linhas (A=3, B=1)`);

  const areas = await post('customer_crop_areas', [
    { tenant_id: TA, customer_id: cli[0].id, crop_name: 'Soja', area_ha: 1200 },
    { tenant_id: TA, customer_id: cli[1].id, crop_name: 'Milho', area_ha: 800 },
    { tenant_id: TA, customer_id: cli[2].id, crop_name: 'Soja', area_ha: 1500 },
    { tenant_id: TB, customer_id: cli[3].id, crop_name: 'Algodao', area_ha: 2000 },
  ]);
  console.log(`  customer_crop_areas: ${areas.length} linhas (A=3, B=1)`);

  const it = await post('it_se_configurations', [
    { tenant_id: TA, safra: '26/27', crop_name: 'Soja', segment_name: 'Sementes', value_per_hectare: 45000 },
    { tenant_id: TA, safra: '26/27', crop_name: 'Soja', segment_name: 'Fertilizantes', value_per_hectare: 120000 },
    { tenant_id: TA, safra: '26/27', crop_name: 'Milho', segment_name: 'Sementes', value_per_hectare: 38000 },
    { tenant_id: TB, safra: '26/27', crop_name: 'Algodao', segment_name: 'Defensivos', value_per_hectare: 210000 },
  ]);
  console.log(`  it_se_configurations: ${it.length} linhas (A=3, B=1)`);

  console.log('\nSeed concluído. Rode: node test_rls_dashboard.js');
})().catch((e) => {
  console.error('\nERRO:', e.message);
  process.exit(1);
});
