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
-- Nota: em produção esta tabela foi renomeada para `clientes` (migration
-- 20260728110000_align_schema_and_rls.sql), para bater com o que o código
-- referencia. Mantido `customers` aqui só por ser o nome histórico deste
-- arquivo de referência.

-- 3. Tabela de Áreas de Cultivo (Customer Crop Areas)
CREATE TABLE IF NOT EXISTS public.customer_crop_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    crop_name TEXT NOT NULL, -- Soja, Milho, Algodão, Cana, Café
    area_ha NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela de Valores de Referência (Índice Tecnológico)
CREATE TABLE IF NOT EXISTS public.it_se_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    safra TEXT NOT NULL, -- Ex: "26/27"
    crop_name TEXT NOT NULL,
    segment_name TEXT NOT NULL,
    value_per_hectare BIGINT NOT NULL, -- em centavos
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabela de Históricos de Faturamento (Faturamento Snapshots)
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
-- 6. HABILITAR SEGURANÇA POR LINHA (ROW LEVEL SECURITY)
-- ============================================================

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_crop_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.it_se_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faturamento_snapshots ENABLE ROW LEVEL SECURITY;

-- Criar Políticas de Isolamento Multi-Tenant por RLS
CREATE POLICY tenant_isolation ON public.customers USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);
CREATE POLICY tenant_isolation ON public.customer_crop_areas USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);
CREATE POLICY tenant_isolation ON public.it_se_configurations USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);
CREATE POLICY tenant_isolation ON public.faturamento_snapshots USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- 7. Tabela de Configurações de Culturas por Tenant
CREATE TABLE IF NOT EXISTS public.tenant_config_culturas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    custom_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, custom_name)
);
-- Colunas adicionadas em produção (migration 20260728113000 e 20260728160000):
-- internal_key, aliases, display_order, ibge_produto, ibge_tipo.

-- 8. Tabela de Configurações de Classificações (Segmentos) por Tenant
CREATE TABLE IF NOT EXISTS public.tenant_config_classificacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    custom_name TEXT NOT NULL,
    parent_key TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, custom_name)
);
-- Colunas adicionadas em produção: internal_key, aliases, display_order, color.

-- 9. Tabela de Planejamento por Cliente e Segmento
CREATE TABLE IF NOT EXISTS public.planejamento_cliente_segmento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    segmento TEXT NOT NULL,
    mes CHAR(2),
    status TEXT DEFAULT 'RASCUNHO',
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Colunas adicionadas em produção (migration 20260728114500): ctv_id,
-- cliente_id, cultivo, valor_planejado_centavos, share_percentual.

ALTER TABLE public.tenant_config_culturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_config_classificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planejamento_cliente_segmento ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON public.tenant_config_culturas USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);
CREATE POLICY tenant_isolation ON public.tenant_config_classificacoes USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);
CREATE POLICY tenant_isolation ON public.planejamento_cliente_segmento USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- 10. Tabela de Convites de Usuário
CREATE TABLE IF NOT EXISTS public.tenant_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    created_by UUID,
    used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tenant_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public.tenant_invites USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- ============================================================
-- Tabelas removidas em 04/08/2026 (auditoria de funcionalidades)
--
-- Existiam no schema, RLS habilitado, mas nenhuma rota de API e nenhuma
-- tela do produto as usava — cada uma sustentava uma feature do PRD que
-- nunca chegou a ser construída. Confirmado 0 linhas nas 5 antes de
-- remover, sem perda de dado:
--
--   customer_faixas       — Régua de Confiança (cores por cliente)
--   scoring_weights       — pesos de priorização/scoring
--   official_safra_plans  — Handshake de governança (RN-06 do PRD)
--   setup_budgets         — orçamento mensal do CTV
--   customer_forecasts    — forecast por cliente
--
-- Se alguma dessas entrar no roadmap, é construção do zero: a tabela não
-- economiza nenhum trabalho de rota ou tela.
-- ============================================================
