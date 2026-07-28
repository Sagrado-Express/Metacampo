-- Fix: Make migrations idempotent (handle existing policies)
-- Skip if tables/policies already exist

-- Drop and recreate policies if they exist (safer than CREATE IF NOT EXISTS for policies)
DROP POLICY IF EXISTS tenant_isolation ON public.tenant_config_culturas;
DROP POLICY IF EXISTS tenant_isolation ON public.tenant_config_classificacoes;
DROP POLICY IF EXISTS tenant_isolation ON public.planejamento_cliente_segmento;

-- Recreate RLS Policies (these must be created fresh)
CREATE POLICY tenant_isolation ON public.tenant_config_culturas
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY tenant_isolation ON public.tenant_config_classificacoes
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY tenant_isolation ON public.planejamento_cliente_segmento
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- Ensure all indexes exist (idempotent with IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_tenant_config_culturas_tenant_id
  ON public.tenant_config_culturas(tenant_id);

CREATE INDEX IF NOT EXISTS idx_tenant_config_classificacoes_tenant_id
  ON public.tenant_config_classificacoes(tenant_id);

CREATE INDEX IF NOT EXISTS idx_planejamento_cliente_segmento_tenant_id
  ON public.planejamento_cliente_segmento(tenant_id);

CREATE INDEX IF NOT EXISTS idx_planejamento_cliente_segmento_customer_id
  ON public.planejamento_cliente_segmento(customer_id);

-- Apply performance indexes on other tables
CREATE INDEX IF NOT EXISTS idx_tenants_id ON public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON public.customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_ctv ON public.customers(tenant_id, ctv_id);
CREATE INDEX IF NOT EXISTS idx_customer_crop_areas_tenant_id ON public.customer_crop_areas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_crop_areas_customer_id ON public.customer_crop_areas(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_crop_areas_tenant_customer ON public.customer_crop_areas(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_it_se_configurations_tenant_id ON public.it_se_configurations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_it_se_configurations_tenant_crop ON public.it_se_configurations(tenant_id, crop_name);
CREATE INDEX IF NOT EXISTS idx_customer_faixas_tenant_id ON public.customer_faixas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_faixas_customer_id ON public.customer_faixas(customer_id);
CREATE INDEX IF NOT EXISTS idx_scoring_weights_tenant_id ON public.scoring_weights(tenant_id);
CREATE INDEX IF NOT EXISTS idx_official_safra_plans_tenant_id ON public.official_safra_plans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_setup_budgets_tenant_id ON public.setup_budgets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_setup_budgets_tenant_mes ON public.setup_budgets(tenant_id, mes);
CREATE INDEX IF NOT EXISTS idx_faturamento_snapshots_tenant_id ON public.faturamento_snapshots(tenant_id);
CREATE INDEX IF NOT EXISTS idx_faturamento_snapshots_tenant_mes ON public.faturamento_snapshots(tenant_id, mes);
