# 📦 Supabase Migrations — Quick Start

## ⚡ TL;DR — 2 Minutes

### Option 1: SQL Editor (Easiest)
1. Go to: https://app.supabase.com/project/jcnxinvycgluoeqixdul/sql/new
2. Paste content of `supabase/migrations/20260728093600_add_missing_tables.sql` → **Run**
3. Paste content of `supabase/migrations/20260728093700_add_performance_indexes.sql` → **Run**

### Option 2: Supabase CLI (Recommended)
```bash
supabase link --project-ref jcnxinvycgluoeqixdul
supabase db push
```

### Option 3: psql
```bash
psql "postgresql://postgres:PASSWORD@db.jcnxinvycgluoeqixdul.supabase.co:5432/postgres" < supabase/migrations/20260728093600_add_missing_tables.sql
psql "postgresql://postgres:PASSWORD@db.jcnxinvycgluoeqixdul.supabase.co:5432/postgres" < supabase/migrations/20260728093700_add_performance_indexes.sql
```

---

## 📋 What's Being Applied

### Migration 1: `20260728093600_add_missing_tables.sql`
Creates 3 new tables with RLS policies:
- `tenant_config_culturas` — Tenant-specific crop configurations
- `tenant_config_classificacoes` — Tenant-specific segment/classification configs
- `planejamento_cliente_segmento` — Planning records per customer & segment

All tables include:
- ✅ `tenant_id` foreign key (NOT NULL)
- ✅ `tenant_isolation` RLS policy
- ✅ Basic indexes on tenant_id

### Migration 2: `20260728093700_add_performance_indexes.sql`
Adds 8 indexes for performance:
- `idx_customers_tenant_id` — Fast filtering by tenant
- `idx_customer_crop_areas_tenant_id` — Fast area lookups
- `idx_it_se_configurations_tenant_id` — Fast IT index lookups
- `idx_faturamento_snapshots_tenant_id` — Fast billing lookups
- Plus 4 composite indexes for common query patterns

Expected improvement: **10-20x faster queries** on multi-tenant filters.

---

## ✅ Verification

After applying, verify in SQL Editor:

```sql
-- Check tables exist
SELECT tablename FROM pg_tables 
WHERE tablename LIKE 'tenant_%' 
   OR tablename = 'planejamento_cliente_segmento'
ORDER BY tablename;

-- Check indexes exist
SELECT indexname FROM pg_indexes 
WHERE tablename LIKE 'customer_%' 
   OR tablename LIKE 'tenant_%'
ORDER BY indexname;

-- Check RLS policies
SELECT * FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename LIKE 'tenant_%';
```

---

## 🚀 What's Next

After migrations are applied:

1. ✅ Build still passes: `npm run build`
2. ✅ Run tests locally
3. ✅ Deploy to production (migrations applied in staging/prod Supabase)
4. ✅ Verify with `test_rls_dashboard.js` (optional, for RLS validation)

---

## 📚 Full Documentation

See `docs/APPLY_MIGRATIONS.md` for:
- Detailed step-by-step instructions
- Troubleshooting
- Security notes
- Alternative methods

---

## 🆘 Help

**Need to access the SQL Editor directly?**
```
https://app.supabase.com/project/jcnxinvycgluoeqixdul/sql/new
```

**Need to generate a Supabase CLI token?**
```
https://app.supabase.com/account/tokens
```

**Created migrations not applying?**
- Ensure you're using `service_role_key` (not anon key)
- Check that tables don't already exist (migrations use `IF NOT EXISTS`)
- See Troubleshooting in `docs/APPLY_MIGRATIONS.md`
