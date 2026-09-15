-- ============================================================
-- Constraint de unicidade em faturamento_snapshots — Épico 5 do PRD
-- (Passo 12 do GTMGC).
--
-- A tabela nunca teve nenhuma constraint de unicidade: reimportar o mesmo
-- mês duplicava a linha em vez de substituir, e o upsert que a importação
-- de CSV precisa fazer (mesmo padrão de planejamento_cliente_segmento,
-- migration 20260728114500) não tinha em cima de que fazer ON CONFLICT.
-- Sem isso, o critério de aceite do Épico 5 "se CSV duplicado, sistema
-- avisa e pergunta se deve substituir" não é implementável no banco.
--
-- Defensivo: a tabela tem zero consumidor de escrita em src/ até hoje
-- (docs/PRD.md linha 468 — "só API", nunca chamada por nenhuma tela), mas
-- por segurança consolida qualquer duplicata pré-existente (soma
-- valor_realizado_centavos na linha mais recente) em vez de descartar
-- valor, antes de criar o índice único.
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.faturamento_snapshots
    GROUP BY tenant_id, mes, id_ctv, segmento
    HAVING COUNT(*) > 1
  ) THEN
    WITH ranked AS (
      SELECT id, tenant_id, mes, id_ctv, segmento,
             ROW_NUMBER() OVER (PARTITION BY tenant_id, mes, id_ctv, segmento ORDER BY created_at DESC, id DESC) AS rn,
             SUM(valor_realizado_centavos) OVER (PARTITION BY tenant_id, mes, id_ctv, segmento) AS soma_realizado
      FROM public.faturamento_snapshots
    )
    UPDATE public.faturamento_snapshots f
    SET valor_realizado_centavos = ranked.soma_realizado
    FROM ranked WHERE f.id = ranked.id AND ranked.rn = 1;

    WITH ranked AS (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY tenant_id, mes, id_ctv, segmento ORDER BY created_at DESC, id DESC) AS rn
      FROM public.faturamento_snapshots
    )
    DELETE FROM public.faturamento_snapshots f USING ranked WHERE f.id = ranked.id AND ranked.rn > 1;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_faturamento_tenant_mes_ctv_segmento
  ON public.faturamento_snapshots(tenant_id, mes, id_ctv, segmento);
