-- ============================================================
-- Alinha planejamento_cliente_segmento com o que a rota
-- /api/planejamento/cliente-segmento realmente grava e lê.
--
-- A tabela foi criada com (customer_id, mes, notas), mas o código usa
-- (ctv_id, cliente_id, cultivo, valor_planejado_centavos, share_percentual)
-- e faz upsert com onConflict em (tenant_id, cliente_id, cultivo, segmento).
-- Sem essas colunas e sem essa constraint, o upsert falha sempre.
--
-- A tabela está vazia, então a reformulação não descarta dados.
-- ============================================================

ALTER TABLE public.planejamento_cliente_segmento
  ADD COLUMN IF NOT EXISTS ctv_id                   TEXT,
  ADD COLUMN IF NOT EXISTS cliente_id               UUID,
  ADD COLUMN IF NOT EXISTS cultivo                  TEXT,
  ADD COLUMN IF NOT EXISTS valor_planejado_centavos BIGINT  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS share_percentual         NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at               TIMESTAMPTZ DEFAULT NOW();

-- customer_id era o nome antigo; o código usa cliente_id.
UPDATE public.planejamento_cliente_segmento
SET cliente_id = customer_id
WHERE cliente_id IS NULL AND customer_id IS NOT NULL;

ALTER TABLE public.planejamento_cliente_segmento
  DROP COLUMN IF EXISTS customer_id;

-- cultivo e cliente_id passam a ser obrigatórios (fazem parte da chave do upsert)
UPDATE public.planejamento_cliente_segmento SET cultivo = '' WHERE cultivo IS NULL;
ALTER TABLE public.planejamento_cliente_segmento
  ALTER COLUMN cultivo SET NOT NULL;

-- Chave usada pelo onConflict do upsert
CREATE UNIQUE INDEX IF NOT EXISTS uq_planejamento_tenant_cliente_cultivo_segmento
  ON public.planejamento_cliente_segmento(tenant_id, cliente_id, cultivo, segmento);

CREATE INDEX IF NOT EXISTS idx_planejamento_cliente_id
  ON public.planejamento_cliente_segmento(cliente_id);
