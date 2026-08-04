-- ============================================================
-- Grupos econômicos: agrupar clientes (fazendas) que pertencem à mesma
-- família/holding. Comum no agro: uma mesma família tem várias fazendas
-- cadastradas como clientes distintos (nomes/CNPJs diferentes).
--
-- Cadastro próprio (não campo de texto livre no cliente), pelo mesmo
-- motivo de culturas/classificações: evita "Família Silva" e "familia
-- silva" virarem grupos diferentes por erro de digitação, e permite
-- renomear o grupo uma vez só, refletindo em todas as fazendas.
--
-- Sem internal_key: ao contrário de cultura/segmento, o nome do grupo
-- nunca é usado como chave de busca em outra tabela (não há
-- "it_se_configurations.grupo_economico" nem similar) — é só um FK direto
-- de clientes.grupo_economico_id, então renomear já é trivial sem chave
-- estável.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.grupos_economicos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, nome)
);

ALTER TABLE public.grupos_economicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON public.grupos_economicos
  FOR ALL USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE INDEX IF NOT EXISTS idx_grupos_economicos_tenant_id
  ON public.grupos_economicos(tenant_id);

-- ON DELETE SET NULL: apagar um grupo não apaga as fazendas, só as
-- desagrupa — consistente com o resto do sistema (nunca deletar dado do
-- cliente como efeito colateral de mexer em configuração).
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS grupo_economico_id UUID REFERENCES public.grupos_economicos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_clientes_grupo_economico_id
  ON public.clientes(grupo_economico_id);
