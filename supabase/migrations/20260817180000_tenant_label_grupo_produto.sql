-- ============================================================
-- Apelido por tenant para "Grupo de Produtos" (ex-"Classificação").
--
-- Pedido do Marco Polo em 13/08/2026: renomear "Classificação" para
-- "Grupo de Produtos" no rótulo padrão, e permitir que cada tenant troque
-- esse rótulo pelo termo que já usa internamente (ex.: "Segmento", como a
-- AA chama).
--
-- NULL = usa o rótulo padrão "Grupo de Produtos" no front. Fica em
-- `tenants`, não em `tenant_config_classificacoes`: é um rótulo do
-- CONCEITO (o guarda-chuva em si), não de uma linha/valor individual
-- (Sementes, Defensivos...) — cada linha já tem seu próprio custom_name.
--
-- UPDATE via RLS comum (tenant-scoped), igual toda outra tabela — o
-- admin-only é reforçado na API route, mesmo padrão de classifications/
-- cultures/indice-tecnologico (Regra Nº4 do CLAUDE.md: RLS decide por
-- tenant, app decide por papel; não existe helper de role em RLS neste
-- schema, nenhuma outra tabela usa isso).
-- ============================================================

ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS label_grupo_produto TEXT;

DROP POLICY IF EXISTS tenant_update_own ON public.tenants;
CREATE POLICY tenant_update_own ON public.tenants
  FOR UPDATE
  USING (id = public.current_tenant_id())
  WITH CHECK (id = public.current_tenant_id());
