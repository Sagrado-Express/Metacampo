-- ==========================================
-- META CAMPO / ANTIGRAVITY V4
-- MIGRATION SCRIPT - MULTI-TENANCY & ANALYTICS
-- ==========================================

-- 1. Criação da tabela de Tenants
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    plano TEXT DEFAULT 'Mvp',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INSERIR TENANT PILOTO PARA SERVIR DE BASE AOS DADOS EXISTENTES
-- (Substitua o UUID abaixo pelo UUID gerado para a sua empresa piloto se desejar)
INSERT INTO public.tenants (id, nome, plano) 
VALUES ('00000000-0000-0000-0000-000000000000', 'Cliente Piloto V4', 'Piloto')
ON CONFLICT (id) DO NOTHING;

-- 2. Adição de tenant_id nas tabelas existentes de Negócio
-- Assumimos que as tabelas abaixo já existem conforme o Blueprint V4.
DO $$ 
DECLARE
    tbl text;
    tabela_nome text;
BEGIN
    FOR tbl IN 
        SELECT unnest(array['customers', 'customer_crop_areas', 'it_se_configurations', 'customer_faixas', 'official_safra_plans', 'scoring_weights'])
    LOOP
        tabela_nome := tbl;
        
        -- Verificar se a tabela existe antes de alterar (evita erro se alguma não foi criada ainda)
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tabela_nome) THEN
            -- Adicionar a coluna tenant_id
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);', tabela_nome);
            
            -- Preencher tenant_id com o piloto para registros existentes
            EXECUTE format('UPDATE public.%I SET tenant_id = ''00000000-0000-0000-0000-000000000000'' WHERE tenant_id IS NULL;', tabela_nome);
            
            -- Alterar para NOT NULL
            EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET NOT NULL;', tabela_nome);
            
            -- Configurar RLS Isolation
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tabela_nome);
            
            -- Remover policy existente se houver para recriar
            EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON public.%I;', tabela_nome);
            
            -- Criar policy de isolamento de Tenant (assumindo que o JWT claim tem o tenant_id)
            EXECUTE format('CREATE POLICY tenant_isolation ON public.%I USING (tenant_id = (auth.jwt()->>''tenant_id'')::uuid);', tabela_nome);
        END IF;
    END LOOP;
END $$;


-- 3. Criação de Novas Tabelas P0 (Roadmap V4)

-- 3.1 setup_budgets (Meta do CTV)
CREATE TABLE IF NOT EXISTS public.setup_budgets (
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    mes CHAR(2) NOT NULL,
    id_ctv TEXT NOT NULL,
    segmento TEXT NOT NULL,
    valor_meta_centavos BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (tenant_id, mes, id_ctv, segmento)
);

ALTER TABLE public.setup_budgets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.setup_budgets;
CREATE POLICY tenant_isolation ON public.setup_budgets USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);


-- 3.2 customer_forecasts (Promessa Comercial Bottom-Up)
CREATE TABLE IF NOT EXISTS public.customer_forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    documento TEXT NOT NULL, -- FK logicamente para customers(documento)
    mes CHAR(2) NOT NULL,
    segmento TEXT NOT NULL,
    valor_previsto_centavos BIGINT NOT NULL,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Indice para facilitar validação com setup_budgets
CREATE INDEX IF NOT EXISTS idx_customer_forecasts_tenant_mes ON public.customer_forecasts(tenant_id, mes, segmento);

ALTER TABLE public.customer_forecasts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.customer_forecasts;
CREATE POLICY tenant_isolation ON public.customer_forecasts USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);


-- 3.3 faturamento_snapshots (Fotografia Mensal de Fechamento YoY)
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

ALTER TABLE public.faturamento_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.faturamento_snapshots;
CREATE POLICY tenant_isolation ON public.faturamento_snapshots USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- FIM DA MIGRAÇÃO V4
