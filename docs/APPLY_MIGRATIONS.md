# Aplicar Migrations no Supabase

## 📍 Status Atual

As migrations foram criadas em `/supabase/migrations/`:
- `20260728093600_add_missing_tables.sql` — Cria 3 tabelas + RLS policies
- `20260728093700_add_performance_indexes.sql` — Adiciona 8 índices

**Próximo passo**: Aplicar essas migrations no Supabase production.

---

## 🚀 Opção 1: Supabase SQL Editor (Mais Fácil)

1. Acesse: https://app.supabase.com/project/jcnxinvycgluoeqixdul/sql/new
2. Copie o conteúdo de `supabase/migrations/20260728093600_add_missing_tables.sql`
3. Cole na SQL Editor e clique **Run**
4. Repita para `20260728093700_add_performance_indexes.sql`

**Vantagem**: Visual, seguro, sem CLI setup.  
**Desvantagem**: Manual (2 passos separados).

---

## 🔧 Opção 2: Supabase CLI (Recomendado)

### Passo 1: Fazer link do projeto

```bash
cd "C:\Projetos Antigravity\Simulador de Carteira"
supabase link --project-ref jcnxinvycgluoeqixdul
```

Será pedido um token de acesso Supabase. Gere um em:  
https://app.supabase.com/account/tokens

### Passo 2: Aplicar migrations

```bash
supabase db push
```

**Vantagem**: Automatizado, rastreável.  
**Desvantagem**: Requer token de acesso e CLI setup.

---

## 🐘 Opção 3: psql CLI (Mais Direto)

### Pré-requisito: Instalar psql

```bash
# Windows: via PostgreSQL installer
# macOS: brew install postgresql
# Linux: sudo apt install postgresql-client
```

### Conectar e executar migrations

```bash
# Tabelas
psql "postgresql://postgres:[PASSWORD]@db.jcnxinvycgluoeqixdul.supabase.co:5432/postgres" < supabase/migrations/20260728093600_add_missing_tables.sql

# Índices
psql "postgresql://postgres:[PASSWORD]@db.jcnxinvycgluoeqixdul.supabase.co:5432/postgres" < supabase/migrations/20260728093700_add_performance_indexes.sql
```

**Nota**: Substitua `[PASSWORD]` pela senha do postgres do Supabase.

**Vantagem**: Direto, sem dependências extra.  
**Desvantagem**: Requer exposição temporária de senha.

---

## ✅ Verificação

Após aplicar, valide com:

```bash
# Verificar tabelas criadas
psql "postgresql://postgres:[PASSWORD]@db.jcnxinvycgluoeqixdul.supabase.co:5432/postgres" \
  -c "SELECT tablename FROM pg_tables WHERE tablename LIKE 'tenant_%' OR tablename = 'planejamento_cliente_segmento';"

# Verificar índices criados
psql "postgresql://postgres:[PASSWORD]@db.jcnxinvycgluoeqixdul.supabase.co:5432/postgres" \
  -c "SELECT indexname FROM pg_indexes WHERE tablename LIKE 'tenant_%' OR tablename LIKE 'customer_%';"
```

---

## 🔐 Notas de Segurança

- ❌ Nunca commite a senha do postgres
- ❌ Nunca passe credenciais em URLs de git
- ✅ Use `.env.local` para variáveis sensíveis
- ✅ Rotate a senha após executar migrations via psql

---

## 📋 Checklist de Aplicação

- [ ] Migrations criadas em `supabase/migrations/`
- [ ] Escolheu método (SQL Editor / CLI / psql)
- [ ] Aplicou `20260728093600_add_missing_tables.sql`
- [ ] Aplicou `20260728093700_add_performance_indexes.sql`
- [ ] Validou tabelas existem (SELECT TABLE_NAME FROM information_schema.tables)
- [ ] Validou índices existem (SELECT indexname FROM pg_indexes)
- [ ] Build local ainda passa: `npm run build`
- [ ] Está pronto para deploy em produção ✅

---

## 🆘 Troubleshooting

**Erro: "Table already exists"**
→ Normal. Migration usa `CREATE TABLE IF NOT EXISTS`.

**Erro: "Policy already exists"**
→ Normal. As policies `tenant_isolation` estão idempotentes.

**Erro: "Access denied"**
→ Verifique que está usando `service_role_key` ou `postgres` password (não anon key).

---

## 📖 Referências

- [Supabase SQL Editor](https://app.supabase.com/projects)
- [Supabase CLI Docs](https://supabase.com/docs/reference/cli/supabase-migration-push)
- [psql Documentation](https://www.postgresql.org/docs/current/app-psql.html)
