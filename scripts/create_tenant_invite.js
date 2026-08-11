#!/usr/bin/env node
/**
 * Cria um tenant novo e um convite pendente pra ele — o jeito manual de
 * cadastrar empresa hoje, já que o self-service (PRD, Épico E2-S2) ainda
 * não existe. Chave de serviço lida de .env.local, nunca hardcoded
 * (Regra Nº5 do CLAUDE.md).
 *
 * Uso: node scripts/create_tenant_invite.js "Nome do Tenant" email@convidado.com
 */
const fs = require('fs');
const crypto = require('crypto');

const raw = fs.readFileSync('.env.local', 'utf-8');
const env = (k) => {
  const m = raw.match(new RegExp('^' + k + '="?([^"\\n]+)"?', 'm'));
  return m ? m[1] : null;
};
const U = env('NEXT_PUBLIC_SUPABASE_URL');
const S = env('SUPABASE_SERVICE_ROLE_KEY');
const APP_URL = env('NEXT_PUBLIC_APP_URL') || 'https://metacampo.vercel.app';

if (!U || !S) {
  console.error('Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY em .env.local');
  process.exit(1);
}

const [, , tenantNome, email] = process.argv;
if (!tenantNome || !email) {
  console.error('Uso: node scripts/create_tenant_invite.js "Nome do Tenant" email@convidado.com');
  process.exit(1);
}

const H = { apikey: S, Authorization: `Bearer ${S}`, 'Content-Type': 'application/json' };

async function post(table, rows) {
  const res = await fetch(`${U}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...H, Prefer: 'return=representation' },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`insert ${table}: ${res.status} ${(await res.text()).slice(0, 250)}`);
  return res.json();
}

(async () => {
  const [tenant] = await post('tenants', [{ nome: tenantNome, plano: 'MVP' }]);
  console.log(`Tenant criado: ${tenant.nome} (${tenant.id})`);

  const token = crypto.randomBytes(24).toString('hex');
  const [invite] = await post('tenant_invites', [
    { tenant_id: tenant.id, email: email.toLowerCase(), token },
  ]);

  const inviteUrl = `${APP_URL}/register?invite=${invite.token}`;
  console.log(`Convite criado para ${invite.email}, expira em ${invite.expires_at}`);
  console.log(`Link: ${inviteUrl}`);
})().catch((e) => {
  console.error('\nERRO:', e.message);
  process.exit(1);
});
