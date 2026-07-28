#!/usr/bin/env node
/**
 * Prova de isolamento RLS entre dois tenants.
 *
 * Faz login REAL no Supabase Auth com dois usuários de tenants diferentes,
 * usa os JWTs assinados que voltam e consulta as tabelas de negócio.
 * O RLS do Postgres é quem decide o que cada um enxerga — não há filtro
 * manual de tenant_id em nenhuma query deste teste.
 *
 * Uso: node test_rls_dashboard.js
 */
const fs = require('fs');

const raw = fs.readFileSync('.env.local', 'utf-8');
const env = (k) => {
  const m = raw.match(new RegExp('^' + k + '="?([^"\\n]+)"?', 'm'));
  return m ? m[1] : null;
};

const URL = env('NEXT_PUBLIC_SUPABASE_URL');
const ANON = env('NEXT_PUBLIC_SUPABASE_ANON_KEY');

const USERS = [
  { label: 'Tenant A', email: 'teste1@metacampo.com', password: 'Teste123!@#', tenant: '11111111-1111-1111-1111-111111111111' },
  { label: 'Tenant B', email: 'teste2@metacampo.com', password: 'Teste123!@#', tenant: '22222222-2222-2222-2222-222222222222' },
];

const TABLES = ['clientes', 'customer_crop_areas', 'tenant_config_culturas', 'tenant_config_classificacoes'];

async function signIn(u) {
  const res = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: u.email, password: u.password }),
  });
  if (!res.ok) throw new Error(`login ${u.email} falhou: ${res.status} ${(await res.text()).slice(0, 160)}`);
  return res.json();
}

async function queryAs(token, table) {
  const res = await fetch(`${URL}/rest/v1/${table}?select=id,tenant_id`, {
    headers: { apikey: ANON, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return { error: `${res.status} ${(await res.text()).slice(0, 120)}` };
  return { rows: await res.json() };
}

(async () => {
  console.log('=== TESTE DE ISOLAMENTO RLS — DOIS TENANTS ===\n');
  console.log(`Banco: ${URL}\n`);

  const sessions = [];
  for (const u of USERS) {
    const s = await signIn(u);
    const claims = JSON.parse(Buffer.from(s.access_token.split('.')[1], 'base64').toString());
    const claimTenant = claims.app_metadata?.tenant_id || claims.tenant_id;
    console.log(`${u.label} (${u.email})`);
    console.log(`  login: OK   sub=${claims.sub}`);
    console.log(`  claim tenant_id no JWT: ${claimTenant}`);
    if (claimTenant !== u.tenant) {
      console.log(`  !! claim divergente do esperado (${u.tenant})`);
    }
    sessions.push({ ...u, token: s.access_token, claimTenant });
  }

  console.log('\n--- Linhas visíveis por tabela (RLS decide, sem filtro manual) ---\n');

  let violations = 0;
  for (const table of TABLES) {
    console.log(`${table}:`);
    for (const s of sessions) {
      const r = await queryAs(s.token, table);
      if (r.error) {
        console.log(`  ${s.label}: ERRO ${r.error}`);
        violations++;
        continue;
      }
      const foreign = r.rows.filter((row) => row.tenant_id && row.tenant_id !== s.tenant);
      console.log(`  ${s.label}: ${r.rows.length} linha(s)` + (foreign.length ? `  <-- ${foreign.length} DE OUTRO TENANT` : ''));
      if (foreign.length) violations++;
    }
  }

  console.log('\n--- Teste negativo: token adulterado deve ser rejeitado ---\n');
  const tampered = sessions[0].token.slice(0, -6) + 'AAAAAA';
  const t = await queryAs(tampered, 'clientes');
  if (t.error) {
    console.log(`  OK — Supabase rejeitou o token adulterado (${t.error.split(' ')[0]})`);
  } else {
    console.log(`  FALHA — token adulterado retornou ${t.rows.length} linha(s)`);
    violations++;
  }

  console.log('\n' + '='.repeat(60));
  if (violations === 0) {
    console.log('RESULTADO: isolamento CONFIRMADO — nenhum tenant enxergou dado do outro.');
    process.exit(0);
  }
  console.log(`RESULTADO: ${violations} violação(ões) detectada(s). Isolamento NAO confirmado.`);
  process.exit(1);
})().catch((e) => {
  console.error('\nErro no teste:', e.message);
  process.exit(1);
});
