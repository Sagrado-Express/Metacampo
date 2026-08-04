-- ============================================================
-- Remove tabelas sem nenhum uso (auditoria de funcionalidades, 04/08/2026)
--
-- As 5 tabelas abaixo tinham RLS habilitado e existiam no schema, mas
-- nenhuma rota de API e nenhuma tela do produto as consultava. Cada uma
-- sustentava uma feature do PRD que nunca chegou a ser construída:
--
--   customer_faixas       — Régua de Confiança (cores por cliente)
--   scoring_weights       — pesos de priorização/scoring
--   official_safra_plans  — Handshake de governança (RN-06 do PRD)
--   setup_budgets         — orçamento mensal do CTV
--   customer_forecasts    — forecast por cliente
--
-- Confirmado 0 linhas nas 5 antes de aplicar esta migration — sem perda
-- de dado. Se alguma dessas features entrar no roadmap, é construção do
-- zero: a tabela sozinha não economizava nenhum trabalho de rota ou tela.
-- ============================================================

DROP TABLE IF EXISTS public.customer_faixas;
DROP TABLE IF EXISTS public.scoring_weights;
DROP TABLE IF EXISTS public.official_safra_plans;
DROP TABLE IF EXISTS public.setup_budgets;
DROP TABLE IF EXISTS public.customer_forecasts;
