-- Migration: Add indexes on tenant_id for performance optimization
-- Created: 2026-07-28 09:37:00 UTC

-- 1. Index on tenants table (id lookup)
CREATE INDEX IF NOT EXISTS idx_tenants_id ON public.tenants(id);

-- 2. Indexes on customers (tenant_id + filtering)
CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON public.customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_ctv ON public.customers(tenant_id, ctv_id);

-- 3. Indexes on customer_crop_areas (tenant_id + customer_id)
CREATE INDEX IF NOT EXISTS idx_customer_crop_areas_tenant_id ON public.customer_crop_areas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_crop_areas_customer_id ON public.customer_crop_areas(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_crop_areas_tenant_customer ON public.customer_crop_areas(tenant_id, customer_id);

-- 4. Indexes on it_se_configurations (tenant_id + common filters)
CREATE INDEX IF NOT EXISTS idx_it_se_configurations_tenant_id ON public.it_se_configurations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_it_se_configurations_tenant_crop ON public.it_se_configurations(tenant_id, crop_name);

-- 5. Indexes on customer_faixas (tenant_id + customer_id)
CREATE INDEX IF NOT EXISTS idx_customer_faixas_tenant_id ON public.customer_faixas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_faixas_customer_id ON public.customer_faixas(customer_id);

-- 6. Index on scoring_weights (tenant_id)
CREATE INDEX IF NOT EXISTS idx_scoring_weights_tenant_id ON public.scoring_weights(tenant_id);

-- 7. Index on official_safra_plans (tenant_id)
CREATE INDEX IF NOT EXISTS idx_official_safra_plans_tenant_id ON public.official_safra_plans(tenant_id);

-- 8. Indexes on setup_budgets (tenant_id + mes + id_ctv)
CREATE INDEX IF NOT EXISTS idx_setup_budgets_tenant_id ON public.setup_budgets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_setup_budgets_tenant_mes ON public.setup_budgets(tenant_id, mes);

-- 9. Indexes on faturamento_snapshots (tenant_id + mes)
CREATE INDEX IF NOT EXISTS idx_faturamento_snapshots_tenant_id ON public.faturamento_snapshots(tenant_id);
CREATE INDEX IF NOT EXISTS idx_faturamento_snapshots_tenant_mes ON public.faturamento_snapshots(tenant_id, mes);
