-- ============================================================
-- MIGRATION: Add missing configuration tables for tenants
-- ============================================================

-- 1. Tabela de Configurações de Culturas por Tenant
CREATE TABLE IF NOT EXISTS public.tenant_config_culturas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    custom_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, custom_name)
);

-- 2. Tabela de Configurações de Classificações (Segmentos) por Tenant
CREATE TABLE IF NOT EXISTS public.tenant_config_classificacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    custom_name TEXT NOT NULL,
    parent_key TEXT, -- para hierarquia de classificações (NULL = root)
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, custom_name)
);

-- 3. Tabela de Planejamento por Cliente e Segmento
CREATE TABLE IF NOT EXISTS public.planejamento_cliente_segmento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    segmento TEXT NOT NULL,
    mes CHAR(2), -- 01-12, NULL = planejamento geral
    status TEXT DEFAULT 'RASCUNHO', -- RASCUNHO, CONFIRMADO, ARQUIVADO
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.tenant_config_culturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_config_classificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planejamento_cliente_segmento ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- CREATE RLS POLICIES
-- ============================================================

-- Policies for tenant_config_culturas
CREATE POLICY tenant_isolation ON public.tenant_config_culturas
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- Policies for tenant_config_classificacoes
CREATE POLICY tenant_isolation ON public.tenant_config_classificacoes
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- Policies for planejamento_cliente_segmento
CREATE POLICY tenant_isolation ON public.planejamento_cliente_segmento
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- ============================================================
-- CREATE INDEXES for performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_tenant_config_culturas_tenant_id
  ON public.tenant_config_culturas(tenant_id);

CREATE INDEX IF NOT EXISTS idx_tenant_config_classificacoes_tenant_id
  ON public.tenant_config_classificacoes(tenant_id);

CREATE INDEX IF NOT EXISTS idx_planejamento_cliente_segmento_tenant_id
  ON public.planejamento_cliente_segmento(tenant_id);

CREATE INDEX IF NOT EXISTS idx_planejamento_cliente_segmento_customer_id
  ON public.planejamento_cliente_segmento(customer_id);
