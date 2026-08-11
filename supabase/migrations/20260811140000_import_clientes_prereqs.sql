-- ============================================================
-- Pré-requisitos pra importação de clientes em massa por CTV.
--
-- Três bugs pré-existentes que a importação exporia pela primeira vez
-- (hoje invisíveis porque ninguém nunca gravou documento real nem
-- duplicou área manualmente):
-- ============================================================

-- 1. clientes.document era UNIQUE global, não por tenant. Dois tenants
--    distintos com um cliente de mesmo CNPJ colidiriam com erro cru de
--    banco. Nunca doeu porque a UI hoje gera document = doc-<timestamp>,
--    sempre único — import em massa é exatamente o cenário onde CNPJ real
--    aparece.
-- Nome real é customers_document_key, não clientes_document_key: a tabela
-- foi renomeada de customers -> clientes em 28/07/2026 (migration
-- 20260728110000), e ALTER TABLE ... RENAME TO não renomeia constraints.
ALTER TABLE public.clientes DROP CONSTRAINT customers_document_key;
ALTER TABLE public.clientes ADD CONSTRAINT clientes_tenant_document_key UNIQUE (tenant_id, document);

-- 2. Nada impede duplicar cultivo pro mesmo cliente hoje — calcVpm soma
--    por área, então duplicar dobra o VPM silenciosamente. Necessário
--    pro upsert de área que a importação faz (atualizar hectares de um
--    cultivo já cadastrado em vez de duplicar a linha).
ALTER TABLE public.customer_crop_areas ADD CONSTRAINT customer_crop_areas_customer_crop_key UNIQUE (customer_id, crop_name);

-- 3. Convite passa a poder nomear o papel do convidado (admin vs CTV) —
--    até aqui todo mundo nascia 'user', sem meio de um admin convidar
--    outro admin.
ALTER TABLE public.tenant_invites ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';
