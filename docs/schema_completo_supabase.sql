-- ============================================================
-- METACAMPO / ANTIGRAVITY V4
-- UNIFIED DATABASE SCHEMA - ALL CORE TABLES & MULTI-TENANCY
-- ============================================================

-- 1. Tabela de Tenants
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    plano TEXT DEFAULT 'MVP',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Tenant Piloto
INSERT INTO public.tenants (id, nome, plano) 
VALUES ('00000000-0000-0000-0000-000000000000', 'Cliente Piloto V4', 'Piloto')
ON CONFLICT (id) DO NOTHING;

-- 2. Tabela de Clientes (Customers)
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    ctv_id TEXT NOT NULL,
    name TEXT NOT NULL,
    document TEXT UNIQUE, -- CNPJ / CPF
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    region TEXT NOT NULL,
    performance_band TEXT DEFAULT 'CINZA', -- AZUL, VERDE, AMARELO, VERMELHO, CINZA
    confidence_level TEXT DEFAULT 'AMARELO', -- AZUL, VERDE, AMARELO, VERMELHO
    credit_rating TEXT DEFAULT 'C', -- A, B, C, D
    wallet_share NUMERIC(5,2) DEFAULT 0.00,
    qualitative_weight INTEGER DEFAULT 3,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de Áreas de Cultivo (Customer Crop Areas)
CREATE TABLE IF NOT EXISTS public.customer_crop_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    crop_name TEXT NOT NULL, -- Soja, Milho, Algodão, Cana, Café
    area_ha NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela de Valores de Referência (IT-SE / ITAA Configurations)
CREATE TABLE IF NOT EXISTS public.it_se_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    safra TEXT NOT NULL, -- Ex: "26/27"
    crop_name TEXT NOT NULL,
    segment_name TEXT NOT NULL,
    value_per_hectare BIGINT NOT NULL, -- em centavos
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabela de Cores da Régua de Confiança (Customer Faixas)
CREATE TABLE IF NOT EXISTS public.customer_faixas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    score NUMERIC(4,2) NOT NULL,
    faixa TEXT NOT NULL, -- AZUL, VERDE, AMARELO, VERMELHO
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabela de Pesos do Scoring (Scoring Weights)
CREATE TABLE IF NOT EXISTS public.scoring_weights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    weight_vpm NUMERIC(3,2) DEFAULT 0.40,
    weight_wallet_share NUMERIC(3,2) DEFAULT 0.30,
    weight_credit NUMERIC(3,2) DEFAULT 0.20,
    weight_relationship NUMERIC(3,2) DEFAULT 0.10,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tabela de Handshake de Governança (Official Safra Plans)
CREATE TABLE IF NOT EXISTS public.official_safra_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    safra_id TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING', -- PENDING, APPROVED
    snapshot_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    approved_by TEXT
);

-- 8. Tabela de Metas Mensais do CTV (Setup Budgets)
CREATE TABLE IF NOT EXISTS public.setup_budgets (
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    mes CHAR(2) NOT NULL,
    id_ctv TEXT NOT NULL,
    segmento TEXT NOT NULL,
    valor_meta_centavos BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (tenant_id, mes, id_ctv, segmento)
);

-- 9. Tabela de Forecast de Clientes (Customer Forecasts)
CREATE TABLE IF NOT EXISTS public.customer_forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    documento TEXT NOT NULL, -- FK lógica
    mes CHAR(2) NOT NULL,
    segmento TEXT NOT NULL,
    valor_previsto_centavos BIGINT NOT NULL,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_customer_forecasts_tenant_mes ON public.customer_forecasts(tenant_id, mes, segmento);

-- 10. Tabela de Históricos de Faturamento (Faturamento Snapshots)
CREATE TABLE IF NOT EXISTS public.faturamento_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    mes CHAR(2) NOT NULL,
    id_ctv TEXT NOT NULL,
    segmento TEXT NOT NULL,
    valor_realizado_centavos BIGINT NOT NULL,
    valor_meta_centavos BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 11. HABILITAR SEGURANÇA POR LINHA (ROW LEVEL SECURITY)
-- ============================================================

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_crop_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.it_se_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_faixas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scoring_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.official_safra_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setup_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faturamento_snapshots ENABLE ROW LEVEL SECURITY;

-- Criar Políticas de Isolamento Multi-Tenant por RLS
CREATE POLICY tenant_isolation ON public.customers USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);
CREATE POLICY tenant_isolation ON public.customer_crop_areas USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);
CREATE POLICY tenant_isolation ON public.it_se_configurations USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);
CREATE POLICY tenant_isolation ON public.customer_faixas USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);
CREATE POLICY tenant_isolation ON public.scoring_weights USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);
CREATE POLICY tenant_isolation ON public.official_safra_plans USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);
CREATE POLICY tenant_isolation ON public.setup_budgets USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);
CREATE POLICY tenant_isolation ON public.customer_forecasts USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);
CREATE POLICY tenant_isolation ON public.faturamento_snapshots USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

