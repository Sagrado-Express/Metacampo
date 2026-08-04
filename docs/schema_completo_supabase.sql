-- ============================================================
-- METACAMPO — SCHEMA COMPLETO (fonte de verdade)
-- ============================================================
-- Este arquivo é um espelho fiel do banco em produção
-- (uoaktryjoztczbwklhzn.supabase.co), extraído da definição live via
-- PostgREST em 04/08/2026 — não é uma base histórica com notas de "o que
-- mudou depois". Se este arquivo divergir do banco, o banco está certo;
-- atualize este arquivo, nunca o contrário.
--
-- Toda alteração de schema entra como uma nova migration em
-- supabase/migrations/ (aplicada via `supabase db push`) e depois é
-- refletida aqui. Não existe outro arquivo de schema no repositório —
-- os antigos docs/create_planejamento_tables.sql,
-- docs/create_tenant_invites.sql, docs/migration_metadata_dictionary.sql,
-- docs/supabase_migration_v4.sql e docs/supabase_security_triggers.sql
-- foram removidos em 04/08/2026 por descreverem uma versão anterior e, em
-- pontos, divergente do que está de fato em produção (ver CLAUDE.md).
-- ============================================================

-- 1. Tenants — uma linha por empresa cliente do SaaS
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    plano TEXT DEFAULT 'MVP',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Clientes (produtores) — nome de produção é `clientes`, não `customers`.
--    Renomeada em 28/07/2026 (migration 20260728110000) para bater com o
--    que o código sempre referenciou.
CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    ctv_id TEXT NOT NULL,
    name TEXT NOT NULL,
    document TEXT UNIQUE, -- CNPJ / CPF, sem validação de formato
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    region TEXT NOT NULL,
    -- As 5 colunas abaixo existem no schema mas NENHUM código em produção
    -- lê ou escreve nelas (confirmado por grep em src/ inteiro, 04/08/2026).
    -- São o esqueleto dos Passos 13/14 do GTMGC (grau de confiança e
    -- segmentação multi-critério), nunca implementados.
    performance_band TEXT DEFAULT 'CINZA',   -- AZUL, VERDE, AMARELO, VERMELHO, CINZA
    confidence_level TEXT DEFAULT 'AMARELO', -- AZUL, VERDE, AMARELO, VERMELHO
    credit_rating TEXT DEFAULT 'C',          -- A, B, C, D
    wallet_share NUMERIC(5,2) DEFAULT 0.00,
    qualitative_weight INTEGER DEFAULT 3,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
    -- updated_at só existe desde 05/08/2026: o PATCH sempre tentou gravar
    -- nela, mas a coluna nunca tinha sido criada — toda edição de cliente
    -- pela UI retornava 503 até essa migration.
    -- grupo_economico_id é adicionada mais abaixo, via ALTER TABLE, depois
    -- que grupos_economicos existe (ela referencia essa tabela por FK).
);

-- 3. Áreas de cultivo — um cliente tem N linhas aqui (multi-cultivo)
CREATE TABLE IF NOT EXISTS public.customer_crop_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    customer_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
    crop_name TEXT NOT NULL,
    area_ha NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Índice Tecnológico (R$/ha por cultura × segmento × safra).
--    Nome de coluna/tabela ainda usa a nomenclatura antiga (it_se_*,
--    crop_name, segment_name) — pendente do Épico 3 do PRD (renomear sem
--    quebrar nada em produção). A UI já exibe só "Índice Tecnológico".
CREATE TABLE IF NOT EXISTS public.it_se_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    safra TEXT NOT NULL, -- Ex: "26/27"
    crop_name TEXT NOT NULL,
    segment_name TEXT NOT NULL,
    value_per_hectare BIGINT NOT NULL, -- em centavos
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Faturamento — hoje só recebe POST direto via /api/faturamento.
--    Não existe parser de CSV nem tela de conciliação (Épico 5 do PRD,
--    Passo 12 do GTMGC): a tabela existe, a ingestão não.
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

-- 6. Culturas configuráveis por tenant (Regra Nº6: nunca lista fixa).
--    aliases é TEXT[], não JSONB — corrigido em relação a uma versão
--    anterior deste doc, que descrevia JSONB por engano.
--    ibge_produto/ibge_tipo: origem no catálogo IBGE (nullable — culturas
--    próprias como "HF" não têm correspondência; não é único, porque
--    "Milho safra" e "Milho safrinha" podem apontar para o mesmo produto).
CREATE TABLE IF NOT EXISTS public.tenant_config_culturas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    custom_name TEXT NOT NULL,
    internal_key TEXT NOT NULL,   -- UPPER_SNAKE_CASE, gerado 1x, nunca regerado
    aliases TEXT[] NOT NULL DEFAULT '{}',
    ibge_produto TEXT,            -- nullable, não único (ver acima)
    ibge_tipo TEXT CHECK (ibge_tipo IS NULL OR ibge_tipo IN ('temporaria', 'permanente')),
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, internal_key)
);

-- 7. Classificações de produto (segmentos) configuráveis por tenant.
--    parent_key permite hierarquia de 2 níveis (Classificação → Sub),
--    mas nenhuma tela em produção hoje cria/edita subclassificação.
CREATE TABLE IF NOT EXISTS public.tenant_config_classificacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    custom_name TEXT NOT NULL,
    internal_key TEXT NOT NULL,
    parent_key TEXT,
    aliases TEXT[] NOT NULL DEFAULT '{}',
    color TEXT DEFAULT '#3B82F6',
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, internal_key)
);

-- 8. Planejamento — Cliente × Cultivo × Segmento (Passos 4-9 do GTMGC).
--    valor_planejado_centavos e share_percentual são o "apetite": quanto
--    do VPM potencial daquela combinação exata o CTV planeja capturar.
CREATE TABLE IF NOT EXISTS public.planejamento_cliente_segmento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    ctv_id TEXT,
    cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
    cultivo TEXT NOT NULL,
    segmento TEXT NOT NULL,
    mes CHAR(2),
    status TEXT DEFAULT 'RASCUNHO',
    notas TEXT,
    valor_planejado_centavos BIGINT NOT NULL DEFAULT 0,
    share_percentual NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, cliente_id, cultivo, segmento)
);

-- 9. Convites de usuário (Gestor/CTV) para o tenant.
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

-- 10. Grupos econômicos — agrupar clientes (fazendas) da mesma família.
--     Cadastro próprio, não campo de texto livre: evita "Família Silva" e
--     "familia silva" virarem grupos diferentes por erro de digitação.
--     Sem internal_key: ao contrário de cultura/segmento, o nome nunca é
--     usado como chave de busca em outra tabela — é só um FK direto de
--     clientes.grupo_economico_id, então renomear já é trivial.
CREATE TABLE IF NOT EXISTS public.grupos_economicos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, nome)
);

-- ON DELETE SET NULL: apagar um grupo desagrupa as fazendas, nunca as apaga.
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS grupo_economico_id UUID REFERENCES public.grupos_economicos(id) ON DELETE SET NULL;
-- RLS, policy e índices deste par de tabelas ficam nos blocos
-- consolidados abaixo, junto com o resto (mesmo padrão de culturas,
-- classificações, planejamento e convites).

-- 11. Vínculo usuário ↔ tenant. PK composta — um usuário pode, em tese,
--     pertencer a mais de um tenant, embora nenhuma tela hoje explore isso
--     (o app assume 1 tenant por usuário, lido de app_metadata do JWT).
CREATE TABLE IF NOT EXISTS public.user_tenants (
    user_id UUID NOT NULL,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, tenant_id)
);

-- Seed do tenant Piloto (dados pedagógicos/demo)
INSERT INTO public.tenants (id, nome, plano)
VALUES ('00000000-0000-0000-0000-000000000000', 'Cliente Piloto V4', 'Piloto')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
-- tenant_id vem de auth.jwt() -> app_metadata ->> tenant_id, injetado
-- automaticamente pelo Supabase Auth a partir de app_metadata do usuário
-- (setado na criação, via supabaseAdmin.auth.admin.createUser ou pelo
-- seed de teste). NÃO existe custom_access_token_hook nem trigger
-- customizada — foi cogitado e documentado num script antigo
-- (supabase_security_triggers.sql, removido), mas nunca ativado, e a
-- claim nativa do Supabase já resolve o isolamento sem essa complexidade.
--
-- Todas as policies usam USING + WITH CHECK (não só USING) — sem
-- WITH CHECK, um INSERT/UPDATE fica sem restrição de tenant mesmo com
-- SELECT corretamente isolado.

ALTER TABLE public.clientes                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_crop_areas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.it_se_configurations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faturamento_snapshots         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_config_culturas        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_config_classificacoes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planejamento_cliente_segmento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_invites                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupos_economicos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tenants                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants                       ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(
    COALESCE(
      NULLIF(auth.jwt() -> 'app_metadata' ->> 'tenant_id', ''),
      NULLIF(auth.jwt() ->> 'tenant_id', '')
    ), ''
  )::uuid
$$;

CREATE POLICY tenant_isolation ON public.clientes
  FOR ALL USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY tenant_isolation ON public.customer_crop_areas
  FOR ALL USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY tenant_isolation ON public.it_se_configurations
  FOR ALL USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY tenant_isolation ON public.faturamento_snapshots
  FOR ALL USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY tenant_isolation ON public.tenant_config_culturas
  FOR ALL USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY tenant_isolation ON public.tenant_config_classificacoes
  FOR ALL USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY tenant_isolation ON public.planejamento_cliente_segmento
  FOR ALL USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY tenant_isolation ON public.tenant_invites
  FOR ALL USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY tenant_isolation ON public.grupos_economicos
  FOR ALL USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

-- user_tenants: cada usuário só enxerga os próprios vínculos
CREATE POLICY user_tenants_self ON public.user_tenants
  FOR SELECT USING (user_id = auth.uid());

-- tenants: cada usuário só enxerga o próprio tenant
CREATE POLICY tenant_self ON public.tenants
  FOR SELECT USING (id = public.current_tenant_id());

-- ============================================================
-- ÍNDICES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_tenants_id                            ON public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_clientes_tenant_id                    ON public.clientes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clientes_tenant_ctv                   ON public.clientes(tenant_id, ctv_id);
CREATE INDEX IF NOT EXISTS idx_customer_crop_areas_tenant_id         ON public.customer_crop_areas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_crop_areas_customer_id       ON public.customer_crop_areas(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_crop_areas_tenant_customer   ON public.customer_crop_areas(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_it_se_configurations_tenant_id        ON public.it_se_configurations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_it_se_configurations_tenant_crop      ON public.it_se_configurations(tenant_id, crop_name);
CREATE INDEX IF NOT EXISTS idx_faturamento_snapshots_tenant_id       ON public.faturamento_snapshots(tenant_id);
CREATE INDEX IF NOT EXISTS idx_faturamento_snapshots_tenant_mes      ON public.faturamento_snapshots(tenant_id, mes);
CREATE INDEX IF NOT EXISTS idx_tenant_config_culturas_tenant_id      ON public.tenant_config_culturas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_culturas_tenant_ibge                  ON public.tenant_config_culturas(tenant_id, ibge_produto);
CREATE INDEX IF NOT EXISTS idx_tenant_config_classificacoes_tenant_id ON public.tenant_config_classificacoes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_planejamento_tenant_id                ON public.planejamento_cliente_segmento(tenant_id);
CREATE INDEX IF NOT EXISTS idx_planejamento_cliente_id               ON public.planejamento_cliente_segmento(cliente_id);
CREATE INDEX IF NOT EXISTS idx_tenant_invites_tenant_id              ON public.tenant_invites(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_invites_token                  ON public.tenant_invites(token);
CREATE INDEX IF NOT EXISTS idx_grupos_economicos_tenant_id           ON public.grupos_economicos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clientes_grupo_economico_id           ON public.clientes(grupo_economico_id);
CREATE INDEX IF NOT EXISTS idx_user_tenants_user_id                  ON public.user_tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tenants_tenant_id                ON public.user_tenants(tenant_id);

-- ============================================================
-- Tabelas removidas em 04/08/2026 (auditoria de funcionalidades)
--
-- Existiam no schema, RLS habilitado, 0 linhas, 0 rota de API, 0 tela.
-- Cada uma sustentava um passo do GTMGC que nunca foi construído:
--
--   customer_faixas       — Passo 13 (Régua de Confiança)
--   scoring_weights       — Passo 14 (scoring/priorização)
--   official_safra_plans  — Passo 10 (Handshake / RN-06 do PRD)
--   setup_budgets         — orçamento mensal do CTV
--   customer_forecasts    — forecast por cliente
--
-- Se alguma entrar no roadmap, é construção do zero: a tabela sozinha
-- não economizava nenhum trabalho de rota ou tela.
-- ============================================================
