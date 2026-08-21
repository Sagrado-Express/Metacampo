-- ============================================================
-- Hierarquia comercial com código: Regional → Distrital → Território → CTV.
--
-- A árvore por manager_id (11/08/2026, ver
-- 20260811150000_hierarquia_comercial.sql) não tinha unidade organizacional
-- nomeada nem código — só pessoa gerenciando pessoa. Pedido do usuário em
-- 20/08/2026: código por regional/distrital (ex.: "SP", "SP-1") e um
-- território nomeado (ex.: "Oeste") onde o CTV atua, pra cadastrar em
-- formato de planilha: Regional | Nome Regional | Distrital | Nome Distrital
-- | Território | Nome CTV.
--
-- Decisão confirmada com o usuário: os 3 níveis (Regional, Distrital, CTV)
-- precisam de login de verdade — cada "responsável" é um user_id real de
-- user_tenants, não texto livre. manager_id NÃO é removido (continua
-- existindo em user_tenants), só deixa de ser a fonte da árvore mostrada em
-- Estrutura Comercial a partir de agora. Migração do dado antigo é feita por
-- script (scripts/migrate_estrutura_comercial.js), não por esta migration —
-- é transformação de dado histórico, não schema.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.regionais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    codigo TEXT NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, codigo),
    FOREIGN KEY (user_id, tenant_id) REFERENCES public.user_tenants(user_id, tenant_id)
);

CREATE TABLE IF NOT EXISTS public.distritais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    regional_id UUID NOT NULL REFERENCES public.regionais(id) ON DELETE CASCADE,
    codigo TEXT NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, codigo),
    FOREIGN KEY (user_id, tenant_id) REFERENCES public.user_tenants(user_id, tenant_id)
);

CREATE TABLE IF NOT EXISTS public.territorios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    distrital_id UUID NOT NULL REFERENCES public.distritais(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    ctv_user_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(distrital_id, nome),
    UNIQUE(tenant_id, ctv_user_id),
    FOREIGN KEY (ctv_user_id, tenant_id) REFERENCES public.user_tenants(user_id, tenant_id)
);

ALTER TABLE public.regionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distritais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.territorios ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON public.regionais
  FOR ALL USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY tenant_isolation ON public.distritais
  FOR ALL USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY tenant_isolation ON public.territorios
  FOR ALL USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE INDEX IF NOT EXISTS idx_regionais_tenant_id ON public.regionais(tenant_id);
CREATE INDEX IF NOT EXISTS idx_distritais_tenant_id ON public.distritais(tenant_id);
CREATE INDEX IF NOT EXISTS idx_distritais_regional_id ON public.distritais(regional_id);
CREATE INDEX IF NOT EXISTS idx_territorios_tenant_id ON public.territorios(tenant_id);
CREATE INDEX IF NOT EXISTS idx_territorios_distrital_id ON public.territorios(distrital_id);
