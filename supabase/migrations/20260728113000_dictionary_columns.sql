-- ============================================================
-- Alinha tenant_config_culturas / tenant_config_classificacoes
-- com o que o SegmentDictionaryService realmente consulta.
--
-- As tabelas foram criadas sem internal_key, aliases, display_order
-- e color — colunas que o service usa em createCultura,
-- createClassificacao, getActiveCulturas e nos row mappers.
-- Sem elas, qualquer "adicionar cultura" falha na query.
-- ============================================================

ALTER TABLE public.tenant_config_culturas
  ADD COLUMN IF NOT EXISTS internal_key  TEXT,
  ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.tenant_config_classificacoes
  ADD COLUMN IF NOT EXISTS internal_key  TEXT,
  ADD COLUMN IF NOT EXISTS aliases       TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS color         TEXT;

-- Backfill do internal_key a partir do custom_name, com a mesma
-- normalizacao de normalizeToKey() em segmentDictionary.service.ts:
-- remove acentos, UPPER, nao-alfanumerico vira _, colapsa e apara _.
UPDATE public.tenant_config_culturas
SET internal_key = trim(both '_' from regexp_replace(
      upper(translate(custom_name,
        'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
        'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC')),
      '[^A-Z0-9]+', '_', 'g'))
WHERE internal_key IS NULL;

UPDATE public.tenant_config_classificacoes
SET internal_key = trim(both '_' from regexp_replace(
      upper(translate(custom_name,
        'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
        'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC')),
      '[^A-Z0-9]+', '_', 'g'))
WHERE internal_key IS NULL;

-- internal_key passa a ser obrigatorio e unico dentro do tenant
ALTER TABLE public.tenant_config_culturas
  ALTER COLUMN internal_key SET NOT NULL;
ALTER TABLE public.tenant_config_classificacoes
  ALTER COLUMN internal_key SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_culturas_tenant_key
  ON public.tenant_config_culturas(tenant_id, internal_key);
CREATE UNIQUE INDEX IF NOT EXISTS uq_classificacoes_tenant_key
  ON public.tenant_config_classificacoes(tenant_id, internal_key);

-- A UNIQUE original em custom_name impede renomear duas entradas para
-- o mesmo rotulo em tenants distintos de forma desnecessaria; a chave
-- de unicidade correta e (tenant_id, internal_key), criada acima.
ALTER TABLE public.tenant_config_culturas
  DROP CONSTRAINT IF EXISTS tenant_config_culturas_tenant_id_custom_name_key;
ALTER TABLE public.tenant_config_classificacoes
  DROP CONSTRAINT IF EXISTS tenant_config_classificacoes_tenant_id_custom_name_key;
