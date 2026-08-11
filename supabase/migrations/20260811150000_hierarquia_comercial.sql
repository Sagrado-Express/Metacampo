-- ============================================================
-- Árvore comercial: CTV → gerente → diretor regional.
--
-- Pedido do Marco Polo em 11/08/2026: hierarquia de quem responde para
-- quem, para agregar a carteira por gerente/diretor do mesmo jeito que já
-- se agrega por grupo econômico (ver planejamento_cliente_segmento /
-- grupos_economicos). Antes não existia nenhuma coluna de hierarquia —
-- `user_tenants.role` é permissão (admin/user), não estrutura de reporte.
--
-- manager_id aponta para outro user_id do MESMO tenant. A FK composta
-- (manager_id, tenant_id) contra a chave primária (user_id, tenant_id) de
-- user_tenants garante isso no próprio banco, não só na aplicação
-- (Regra Nº4 do CLAUDE.md — multi-tenancy inegociável).
--
-- Sem CHECK de ciclo aqui (A gerencia B, B gerencia A): grafo pequeno,
-- validado na API ao salvar, igual à validação de auto-referência.
-- ============================================================

ALTER TABLE public.user_tenants ADD COLUMN IF NOT EXISTS manager_id UUID;

ALTER TABLE public.user_tenants DROP CONSTRAINT IF EXISTS user_tenants_manager_fk;
ALTER TABLE public.user_tenants
  ADD CONSTRAINT user_tenants_manager_fk
  FOREIGN KEY (manager_id, tenant_id) REFERENCES public.user_tenants(user_id, tenant_id);

ALTER TABLE public.user_tenants DROP CONSTRAINT IF EXISTS user_tenants_no_self_manager;
ALTER TABLE public.user_tenants
  ADD CONSTRAINT user_tenants_no_self_manager
  CHECK (manager_id IS NULL OR manager_id <> user_id);

CREATE INDEX IF NOT EXISTS idx_user_tenants_manager_id ON public.user_tenants(manager_id);
