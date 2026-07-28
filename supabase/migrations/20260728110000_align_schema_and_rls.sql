-- ============================================================
-- Alinha o banco com o código + RLS real baseado em JWT
-- Idempotente: seguro rodar mais de uma vez.
-- ============================================================

-- ------------------------------------------------------------
-- 1. customers -> clientes (o código referencia 'clientes' em 5 pontos)
--    FKs, índices e policies seguem o rename automaticamente no Postgres.
-- ------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'customers')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables
                     WHERE table_schema = 'public' AND table_name = 'clientes')
  THEN
    ALTER TABLE public.customers RENAME TO clientes;
  END IF;
END $$;

-- ------------------------------------------------------------
-- 2. Tabelas que o código usa mas não existiam
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_tenants (
    user_id    UUID NOT NULL,
    tenant_id  UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    role       TEXT NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, tenant_id)
);

CREATE TABLE IF NOT EXISTS public.tenant_invites (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    email      TEXT NOT NULL,
    token      TEXT NOT NULL UNIQUE,
    created_by UUID,
    used_at    TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 3. Helper: lê tenant_id do JWT.
--    O Supabase injeta app_metadata no access token automaticamente,
--    então NÃO é preciso custom_access_token_hook nem toggle no dashboard.
--    Aceita também a claim na raiz, por compatibilidade.
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 4. RLS em todas as tabelas de negócio
-- ------------------------------------------------------------
ALTER TABLE public.clientes                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_crop_areas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.it_se_configurations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_faixas               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scoring_weights               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.official_safra_plans          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setup_budgets                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_forecasts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faturamento_snapshots         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_config_culturas        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_config_classificacoes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planejamento_cliente_segmento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_invites                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tenants                  ENABLE ROW LEVEL SECURITY;

-- Recria as policies com USING + WITH CHECK.
-- (As policies antigas só tinham USING, o que deixava INSERT sem restrição.)
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'clientes',
    'customer_crop_areas',
    'it_se_configurations',
    'customer_faixas',
    'scoring_weights',
    'official_safra_plans',
    'setup_budgets',
    'customer_forecasts',
    'faturamento_snapshots',
    'tenant_config_culturas',
    'tenant_config_classificacoes',
    'planejamento_cliente_segmento',
    'tenant_invites'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON public.%I
         FOR ALL
         USING (tenant_id = public.current_tenant_id())
         WITH CHECK (tenant_id = public.current_tenant_id())', t);
  END LOOP;
END $$;

-- user_tenants: o usuário enxerga apenas os próprios vínculos
DROP POLICY IF EXISTS user_tenants_self ON public.user_tenants;
CREATE POLICY user_tenants_self ON public.user_tenants
  FOR SELECT
  USING (user_id = auth.uid());

-- tenants: o usuário enxerga apenas o próprio tenant
DROP POLICY IF EXISTS tenant_self ON public.tenants;
CREATE POLICY tenant_self ON public.tenants
  FOR SELECT
  USING (id = public.current_tenant_id());

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- 5. Índices das tabelas novas
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_user_tenants_user_id    ON public.user_tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tenants_tenant_id  ON public.user_tenants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_invites_tenant_id ON public.tenant_invites(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_invites_token     ON public.tenant_invites(token);
CREATE INDEX IF NOT EXISTS idx_clientes_tenant_id       ON public.clientes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clientes_tenant_ctv      ON public.clientes(tenant_id, ctv_id);

-- ------------------------------------------------------------
-- 6. Tenants de teste (para validar isolamento entre dois tenants)
-- ------------------------------------------------------------
INSERT INTO public.tenants (id, nome, plano) VALUES
  ('11111111-1111-1111-1111-111111111111', 'CTV Teste A', 'Piloto'),
  ('22222222-2222-2222-2222-222222222222', 'CTV Teste B', 'Piloto')
ON CONFLICT (id) DO NOTHING;
