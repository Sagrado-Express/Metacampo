-- ============================================================
-- Bug pré-existente (achado ao testar grupos econômicos, 05/08/2026):
-- PATCH /api/clientes sempre tentou gravar clientes.updated_at, mas essa
-- coluna nunca existiu — a tabela `clientes` (renomeada de `customers` em
-- 28/07/2026) nunca teve `updated_at`, diferente de quase todas as outras
-- tabelas do schema. Toda edição de cliente pela UI retornava 503 e
-- ninguém tinha testado esse caminho até agora.
-- ============================================================

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
