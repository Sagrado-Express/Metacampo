-- ============================================================
-- Culturas: apelidos + origem no catálogo IBGE
--
-- Hoje só as classificações têm apelidos. As culturas precisam do mesmo,
-- porque o nome do catálogo IBGE é longo ("Algodão herbáceo (em caroço)")
-- e o tenant vai querer chamar de "Algodão".
--
-- ibge_produto registra de qual item do catálogo a cultura veio. É nullable
-- de propósito: culturas próprias como "HF" não vêm do catálogo. E não é
-- único, porque "Milho safra" e "Milho safrinha" apontam para o mesmo
-- "Milho (em grão)".
-- ============================================================

ALTER TABLE public.tenant_config_culturas
  ADD COLUMN IF NOT EXISTS aliases      TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ibge_produto TEXT,
  ADD COLUMN IF NOT EXISTS ibge_tipo    TEXT
    CHECK (ibge_tipo IS NULL OR ibge_tipo IN ('temporaria', 'permanente'));

-- Permite listar rapidamente o que o tenant já habilitou do catálogo
CREATE INDEX IF NOT EXISTS idx_culturas_tenant_ibge
  ON public.tenant_config_culturas(tenant_id, ibge_produto);
