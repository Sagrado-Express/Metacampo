-- ============================================================
-- De-Para: uma cultura própria associada a VÁRIOS produtos do catálogo
-- IBGE (ou nomes fora do catálogo), não só um.
--
-- Pedido do Marco Polo (25/08/2026): "HF é representado por tomate, batata
-- e hortaliça folhosa — escolhe uma ou mais culturas do IBGE e dá um nome
-- próprio pra elas". Reabre o item explicitamente adiado em 04/08/2026
-- ("vamos nascer com essa versão 1.0 sem isso") — agora com pedido
-- explícito do usuário, ver docs/PRD.md §16.4.
--
-- tenant_config_culturas.ibge_produto era 1 string (0 ou 1 produto por
-- cultura). Vira uma tabela N-pra-1: cada linha é um par (cultura,
-- produto). ibge_tipo fica nullable porque o de-para aceita produto fora
-- do catálogo oficial (ex.: "hortaliça folhosa", que a PAM não lista).
--
-- Corte limpo, sem coluna dupla pra trás: backfill do dado existente pra
-- cá, depois as colunas antigas somem. Todo código que lia
-- ibgeProduto/ibgeTipo (badge, "+variante", exclusão de sugestão já
-- habilitada) foi reescrito pra ler daqui — não sobra nenhum consumidor
-- das colunas antigas.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tenant_cultura_ibge_produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    tenant_cultura_id UUID NOT NULL REFERENCES public.tenant_config_culturas(id) ON DELETE CASCADE,
    ibge_produto TEXT NOT NULL,
    ibge_tipo TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_cultura_id, ibge_produto)
);

ALTER TABLE public.tenant_cultura_ibge_produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON public.tenant_cultura_ibge_produtos
  FOR ALL USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE INDEX IF NOT EXISTS idx_tenant_cultura_ibge_produtos_tenant_id
  ON public.tenant_cultura_ibge_produtos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_cultura_ibge_produtos_cultura_id
  ON public.tenant_cultura_ibge_produtos(tenant_cultura_id);

-- Backfill: uma linha por cultura que já tinha um produto vinculado.
INSERT INTO public.tenant_cultura_ibge_produtos (tenant_id, tenant_cultura_id, ibge_produto, ibge_tipo)
SELECT tenant_id, id, ibge_produto, ibge_tipo
FROM public.tenant_config_culturas
WHERE ibge_produto IS NOT NULL
ON CONFLICT (tenant_cultura_id, ibge_produto) DO NOTHING;

ALTER TABLE public.tenant_config_culturas DROP COLUMN IF EXISTS ibge_produto;
ALTER TABLE public.tenant_config_culturas DROP COLUMN IF EXISTS ibge_tipo;
