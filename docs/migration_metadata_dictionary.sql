-- ============================================================
-- METACAMPO / ANTIGRAVITY V4
-- MIGRATION: METADATA DICTIONARY ARCHITECTURE
-- Passo 0 - Parametrização do Tenant
-- ============================================================
-- Alinhado com reunião Daniel × Marco Polo (16/06/2026):
--   - Liberdade total de nomenclatura por tenant
--   - Hierarquia Classificação → Subclassificação (2 níveis)
--   - Aliases JSONB para matching de CSV do ERP
--   - Software único com RLS (sem bases separadas)
-- ============================================================

-- 1. Tabela de Classificações de Produto (Dicionário de Metadados)
-- Substitui o conceito de "segmento" hardcoded por classificações
-- configuráveis por tenant, conforme sugestão do Marco Polo:
-- "O nome é o que menos me importa, é para que serve esse campo"
CREATE TABLE IF NOT EXISTS public.tenant_config_classificacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),

    -- Chave canônica UPPER_SNAKE_CASE gerada automaticamente do custom_name.
    -- Usada internamente por todos os motores (VPM, TO-GO, Pareto).
    -- Analogia Marco Polo: "batalha naval A1, A2, A3... as células têm código"
    internal_key TEXT NOT NULL,

    -- Hierarquia de 2 níveis (GAP 1 da reunião):
    -- NULL = Classificação raiz (nível 1) ex: DEFENSIVOS
    -- 'DEFENSIVOS' = Subclassificação (nível 2) ex: HERBICIDAS_SELETIVOS
    -- Referência à internal_key do pai no mesmo tenant
    parent_key TEXT DEFAULT NULL,

    -- Nome de exibição customizado pelo tenant.
    -- Analogia Marco Polo: "o nome que a pessoa tá acostumada a chamar"
    custom_name TEXT NOT NULL,

    -- Array de strings alternativas para matching de CSV do ERP.
    -- Ex: ["Defensivos", "Mata-Mato", "Agroquímicos"]
    -- Todas resolvem para a mesma internal_key.
    aliases JSONB DEFAULT '[]'::jsonb,

    -- Controle de visibilidade: liga/desliga por tenant.
    -- "Só trabalho com biológico e defensivo? Só deixo habilitados os dois."
    is_active BOOLEAN DEFAULT true,

    -- Ordem de exibição nos gráficos e tabelas
    display_order INTEGER DEFAULT 0,

    -- Cor HEX para renderização nos gráficos (Waterfall, Mix, etc.)
    color TEXT DEFAULT '#6B7280',

    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unicidade da chave interna por tenant
    UNIQUE(tenant_id, internal_key)
);

-- Comentários de documentação
COMMENT ON TABLE public.tenant_config_classificacoes IS 'Dicionário de metadados: classificações de produto parametrizáveis por tenant (Padrão de Dicionário V4)';
COMMENT ON COLUMN public.tenant_config_classificacoes.internal_key IS 'Chave canônica UPPER_SNAKE_CASE usada internamente. Nunca exibida ao usuário.';
COMMENT ON COLUMN public.tenant_config_classificacoes.parent_key IS 'Referência à internal_key do pai (mesmo tenant). NULL = raiz. Permite hierarquia Classificação → Subclassificação.';
COMMENT ON COLUMN public.tenant_config_classificacoes.aliases IS 'JSONB array de strings alternativas para matching durante ingestão de CSV do ERP.';


-- 2. Tabela de Culturas Parametrizáveis
-- Complementa o dicionário permitindo que o tenant defina
-- quais culturas trabalha (ex: Soja, Milho, Algodão).
-- Conforme Marco Polo: "quais são os seus principais cultivos?"
CREATE TABLE IF NOT EXISTS public.tenant_config_culturas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),

    -- Chave canônica UPPER_SNAKE_CASE (ex: SOJA, MILHO, ALGODAO)
    internal_key TEXT NOT NULL,

    -- Nome de exibição customizado pelo tenant
    custom_name TEXT NOT NULL,

    -- Controle de visibilidade
    is_active BOOLEAN DEFAULT true,

    -- Ordem de exibição
    display_order INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unicidade da chave interna por tenant
    UNIQUE(tenant_id, internal_key)
);

COMMENT ON TABLE public.tenant_config_culturas IS 'Culturas agrícolas parametrizáveis por tenant. Complementa o dicionário de classificações.';


-- ============================================================
-- 3. ROW LEVEL SECURITY (Regra 7 GEMINI.md)
-- SEMPRE incluir tenant_id em toda nova tabela.
-- SEMPRE usar filtro .eq('tenant_id', tenantId).
-- ============================================================

-- RLS para Classificações
ALTER TABLE public.tenant_config_classificacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON public.tenant_config_classificacoes;
CREATE POLICY tenant_isolation ON public.tenant_config_classificacoes
    USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- Policy para INSERT (service_role ou usuário autenticado do tenant)
DROP POLICY IF EXISTS tenant_insert ON public.tenant_config_classificacoes;
CREATE POLICY tenant_insert ON public.tenant_config_classificacoes
    FOR INSERT WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- Policy para UPDATE
DROP POLICY IF EXISTS tenant_update ON public.tenant_config_classificacoes;
CREATE POLICY tenant_update ON public.tenant_config_classificacoes
    FOR UPDATE USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid)
    WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- RLS para Culturas
ALTER TABLE public.tenant_config_culturas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON public.tenant_config_culturas;
CREATE POLICY tenant_isolation ON public.tenant_config_culturas
    USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

DROP POLICY IF EXISTS tenant_insert ON public.tenant_config_culturas;
CREATE POLICY tenant_insert ON public.tenant_config_culturas
    FOR INSERT WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

DROP POLICY IF EXISTS tenant_update ON public.tenant_config_culturas;
CREATE POLICY tenant_update ON public.tenant_config_culturas
    FOR UPDATE USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid)
    WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);


-- ============================================================
-- 4. ÍNDICES DE PERFORMANCE
-- ============================================================

-- Busca rápida de classificações ativas por tenant (usado no cache Redis)
CREATE INDEX IF NOT EXISTS idx_tenant_config_class_active
    ON public.tenant_config_classificacoes(tenant_id, is_active);

-- Busca rápida de filhos por parent_key (navegação hierárquica)
CREATE INDEX IF NOT EXISTS idx_tenant_config_class_parent
    ON public.tenant_config_classificacoes(tenant_id, parent_key)
    WHERE parent_key IS NOT NULL;

-- Busca rápida de culturas ativas por tenant
CREATE INDEX IF NOT EXISTS idx_tenant_config_cult_active
    ON public.tenant_config_culturas(tenant_id, is_active);

-- GIN index para busca dentro do JSONB de aliases
CREATE INDEX IF NOT EXISTS idx_tenant_config_class_aliases
    ON public.tenant_config_classificacoes USING GIN (aliases);


-- ============================================================
-- FIM DA MIGRAÇÃO - METADATA DICTIONARY V4
-- ============================================================
