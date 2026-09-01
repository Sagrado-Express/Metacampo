-- ============================================================
-- Dois índices faltantes achados em auditoria de performance (31/08/2026):
-- planejamento_cliente_segmento.ctv_id (gravado em toda linha, ainda sem
-- consumidor que filtre por ele hoje, mas candidato natural pra uma futura
-- visão "meu planejamento" por CTV) e it_se_configurations.safra (usado em
-- todo filtro de Índice Tecnológico por safra, ex. ITMatrix).
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_planejamento_ctv_id ON public.planejamento_cliente_segmento(ctv_id);
CREATE INDEX IF NOT EXISTS idx_it_se_configurations_safra ON public.it_se_configurations(tenant_id, safra);
