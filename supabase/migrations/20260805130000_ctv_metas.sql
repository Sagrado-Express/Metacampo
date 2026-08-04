-- ============================================================
-- Meta individual de vendas por CTV — Passo 1 do GTMGC (Viabilidade).
--
-- Antes desta migration não existia nenhum jeito de um CTV registrar sua
-- meta de vendas + share de mercado estimado para a safra; a rota
-- /api/diagnostico/viabilidade só calculava com valores digitados na hora
-- (nada persistido), e não havia como comparar contra o "apetite total"
-- já planejado (planejamento_cliente_segmento.valor_planejado_centavos).
--
-- RLS é só por tenant (mesmo padrão de toda tabela existente — nenhuma
-- tem RLS por usuário). "Só vejo/edito minha própria meta" é aplicado na
-- API, filtrando ctv_id = ctx.userId, igual à troca de senha.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ctv_metas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    ctv_id TEXT NOT NULL,
    safra TEXT NOT NULL DEFAULT '25/26',
    meta_vendas_centavos BIGINT NOT NULL DEFAULT 0,
    share_estimado NUMERIC NOT NULL DEFAULT 0 CHECK (share_estimado >= 0 AND share_estimado <= 1),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, ctv_id, safra)
);

ALTER TABLE public.ctv_metas ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON public.ctv_metas
  FOR ALL USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE INDEX IF NOT EXISTS idx_ctv_metas_tenant_id ON public.ctv_metas(tenant_id);
