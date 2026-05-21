# MetaCampo / Antigravity V4 — Documento Mestre de Alinhamento

**Consolidação de Expectativas, Arquitetura e Roadmap**
* **Versão:** 1.0 — Documento inicial consolidado
* **Data:** 21/05/2026
* **Status:** Para revisão e alinhamento dos sócios
* **Responsável:** Daniel (Lead Developer)
* **Fontes:** PRD.md, ARCHITECTURE.md, GEMINI.md, Blueprint V4, INFRASTRUCTURE.md, ROADMAP.md, WALKTHROUGH.md

## Propósito deste documento
Este documento consolida e resolve todas as divergências identificadas entre os 7 arquivos técnicos do projeto MetaCampo / Antigravity V4.
Ele serve como fonte única de verdade (Single Source of Truth) para sócios, desenvolvedor e o copiloto de IA (GEMINI.md).
Toda decisão de arquitetura ou produto deve ser verificada aqui antes de ser implementada.

---

## 1. Status Real do Projeto
Esta seção apresenta o estado factual do desenvolvimento em 21 de maio de 2026, cruzando o ROADMAP.md (versão V4) com o WALKTHROUGH.md e o Blueprint V4.

### 1.1 Progresso por Fase
| Fase | Período | Status | Entregas Confirmadas |
|---|---|---|---|
| Fase 1 — Setup & Modelagem | Semanas 1–2 | ✓ Concluída | Bootstrap Next.js + Supabase · Schema VPM/Crops/Audit · Design System Glassmorphism · Dashboard Shell + Nav |
| Fase 2 — Motor VPM & Janelas Agrícolas | Semanas 3–5 | ✓ Concluída | Materialização de Áreas (Passo 3) · Interface Janelas Agrícolas · Ajuste de Share por Safra · Testes Unitários VPM Golden Master |
| Fase 3 — Middleware Transiente & Auditoria | Semanas 6–7 | ✓ Concluída | Parser CSV Edge-Ready · Integração IBGE PAM · Auditoria Imutável · Memory-First (Zero Persistência de Brutos) |
| Fase 4 — Inteligência Comercial | Semana 8 | ⏳ Em andamento | 5 Workspaces integrados ✓ · Pareto com 4 pilares ✓ · Planos de Visita ✓ · Régua de Confiança ✓ · Refinamento Saldo TO GO ⏳ |
| Fase 5 — Expansão Comercial | Semanas 9–10 | ○ Não iniciada | Integração ERP Rating · Dashboard Market Share · Homologação Final · Deploy Produção |

**Conclusão sobre o estado atual:**
70% do MVP técnico está concluído. O motor central (VPM, Pareto, Memory-First Middleware) existe e funciona.
O único item pendente da Fase 4 é o refinamento da interface do Saldo TO GO — não é uma funcionalidade nova, é polimento.
As semanas 9–10 são de expansão e homologação, não de fundação técnica.

---

## 2. Especificação Canônica do VPM
Esta é a divergência mais crítica encontrada: a fórmula do VPM aparece com três nomenclaturas distintas nos documentos técnicos. Esta seção define a versão canônica e declara as demais obsoletas.

### 2.1 Divergências Identificadas
| Ponto de Decisão | Opção Descartada | Decisão Adotada (Canônica) |
|---|---|---|
| Nomenclatura da fórmula VPM | ARCHITECTURE.md: Soma(HA_CULTURA × ITAA_CULTURA) | VPM = Σ (Hectares_Cultura × IT-SE_Cultura × Fator_Safra) |
| Nome do coeficiente técnico | GEMINI.md: 'Valor/ha' e 'Fator Sazonal' (termos genéricos) | IT-SE (Índice Técnico por Segmento e Cultura) — conforme Blueprint V4 |
| Tabela de configuração | ARCHITECTURE.md: campo 'ITAA' (ITAA_CULTURA) | it_se_configurations — tabela do Blueprint V4. ITAA é alias obsoleto. |

### 2.2 Fórmula Canônica (Fonte Única de Verdade)
**Fórmula oficial do VPM — use esta em todo o código e documentação**
`VPM_Cliente = Σ (HA_Cultura × IT-SE_Cultura_Segmento × Fator_Safra_Vigente)`

Onde:
* **HA_Cultura:** hectares plantados da cultura (tabela `customer_crop_areas`)
* **IT-SE_Cultura_Segmento:** valor R$/ha por cultura e segmento (tabela `it_se_configurations`)
* **Fator_Safra_Vigente:** multiplicador sazonal da janela agrícola ativa (0.0 a 1.0)

Unidade de trabalho interno: CENTAVOS (inteiros). Converter para R$ apenas na exibição.
Alias obsoletos que NÃO devem mais ser usados: ITAA, ITAA_CULTURA, Valor/ha.

### 2.3 Mapeamento de Tabelas
| Variável na Fórmula | Tabela Supabase | Campo | Observação |
|---|---|---|---|
| HA_Cultura | `customer_crop_areas` | `ha_plantado` | Por cultura: soja, milho, algodão, cana, café |
| IT-SE_Cultura_Segmento | `it_se_configurations` | `valor_por_ha_centavos` | Por cultura + segmento + safra. Configurável no Admin. |
| Fator_Safra_Vigente | `it_se_configurations` | `fator_sazonal` | Decimal 0.0–1.0. Atualizado nas Janelas Agrícolas. |
| VPM_Cliente (resultado) | `customers` | `vpm_calculado_centavos` | Atualizado após cada ingestão ou recalculo manual. |

---

## 3. Schema de Dados Consolidado
Esta seção resolve o conflito entre o modelo de dados do ARCHITECTURE.md e do Blueprint V4, além de adicionar as tabelas ausentes identificadas na análise.

### 3.1 Conflito: Setup Budget vs sales_forecasts
**Decisão de arquitetura — Budget vs Forecast**
* ARCHITECTURE.md define: Setup Budget com chave [MES, ID_CTV, SEGMENTO] — representa a META agregada do vendedor.
* Blueprint V4 define: sales_forecasts — representa a promessa comercial por cliente e segmento.

**DECISÃO:** São entidades distintas com responsabilidades diferentes. Ambas devem existir.
* `setup_budgets`: meta top-down do gestor para o vendedor (soma total por mês/segmento)
* `customer_forecasts`: previsão bottom-up por cliente (soma deve ≤ setup_budget do CTV)
* A validação de que Σ(customer_forecasts) ≤ setup_budget é feita no Edge Runtime.

### 3.2 Tabelas — Status e Especificação
| Campo / Entidade | Status | Como está hoje | Como deve ficar |
|---|---|---|---|
| `customers` | ✓ OK | Existe. Campos: ID_DIRETOR, ID_GERENTE, ID_CTV, DOCUMENTO, COD_MUNICIPIO_IBGE, RATING_CREDITO, RELACIONAMENTO. | Adicionar: `tenant_id UUID NOT NULL` (ver Seção 5). Campo RATING_CREDITO deve existir mesmo antes da integração ERP — preencher manualmente no início. |
| `customer_crop_areas` | ✓ OK | Existe. HA por cultura por cliente. | Sem mudanças. Confirmar que `ha_plantado` é armazenado em inteiros (m²) ou float com validação de teto IBGE. |
| `it_se_configurations` | ✓ OK | Existe como tabela Admin (Blueprint V4). Renomeia o conceito ITAA. | Confirmar campos: cultura, segmento, safra, valor_por_ha_centavos, fator_sazonal. Adicionar `tenant_id`. |
| `setup_budgets` | ⚠ Diverge | ARCHITECTURE.md chama de 'Setup Budget [MES, ID_CTV, SEGMENTO]'. Blueprint não nomeia explicitamente. | Nome canônico: `setup_budgets`. Campos: [tenant_id, mes CHAR(2), id_ctv, segmento, valor_meta_centavos]. Chave composta: [tenant_id, mes, id_ctv, segmento]. |
| `customer_forecasts` | ✗ Ausente | Blueprint chama de sales_forecasts mas não há schema detalhado. ARCHITECTURE.md não menciona. | Criar tabela: [tenant_id, documento FK, mes, segmento, valor_previsto_centavos, criado_em]. Validação: soma por CTV/mês não pode exceder setup_budgets correspondente. |
| `sales_results_ytd` | ✓ OK | Existe como processamento transiente (Memory-First). Correto — não deve persistir dados brutos. | Manter como transiente. Nenhuma mudança necessária. |
| `faturamento_snapshots` | ✗ Ausente | Não existe em nenhum documento. Bloqueia YoY (Fase 3 do roadmap de produto) e dashboard gerencial. | CRIAR: [tenant_id, mes, id_ctv, segmento, valor_realizado_centavos, valor_meta_centavos, created_at]. Populado ao final de cada processamento transiente como agregado imutável. |
| `customer_faixas` | ✓ OK | Existe. Resultado do motor Pareto (cores). | Adicionar `tenant_id`. Confirmar que é recalculado após cada ingestão, não editado manualmente. |
| `official_safra_plans` | ✓ OK | Existe como snapshot imutável para Handshake (Blueprint V4). | Adicionar `tenant_id`. Confirmar que o workflow Pending→Approved está implementado. |
| `tenants` | ✗ Ausente | Não existe em nenhum documento. Necessária para multi-tenancy (Fase 5 do roadmap). | CRIAR antes do deploy: [id UUID PK, nome, created_at, plano]. Todas as tabelas acima recebem `tenant_id` FK para esta tabela. |
| `scoring_weights` | ✓ OK | Existe (Blueprint V4 — Admin Setup). | Adicionar `tenant_id` para permitir pesos diferentes por empresa futuramente. |

---

## 4. Roadmap de Produto vs Capacidade Técnica
Esta seção cruza o roadmap de produto dos sócios (5 fases) com o estado técnico atual e identifica o que está coberto, o que diverge e o que precisa ser construído.

### 4.1 Matriz de Alinhamento
| Fase | Entrega (Roadmap Produto) | Status Técnico | Gap Identificado | Ação Necessária |
|---|---|---|---|---|
| Fase 1 Vendedor | Tela gestão vendedor<br>Edição de meta por cliente<br>Histórico ano anterior<br>Status por cores (Pareto) | ⚠ Parcial | Pareto existe. Meta por cliente (`customer_forecasts`) não existe ainda. Histórico YoY sem tabela de snapshot. | Criar `customer_forecasts` e `faturamento_snapshots` (Seção 3). |
| Fase 1 Vendedor | Ordenação por valor e share<br>Share projetado<br>Parametrização de cores | ✓ Coberto | VPM, Wallet Share e Pareto_Color_Engine implementados. Configuração de pesos em `scoring_weights`. | Refinar interface do Saldo TO GO (único item pendente da Fase 4 do ROADMAP.md). |
| Fase 2 Gestão | Dashboard executivo básico<br>Visão por gerente e equipe<br>Ranking de vendedores | ⚠ Parcial | Executive_Cockpit_Engine e simulação de RLS existem na ARCHITECTURE.md. Sem tabela de snapshot para séries temporais. | Usar `faturamento_snapshots` criado na Fase 1. RLS multi-tenant a definir. |
| Fase 2 Gestão | Orçamento x realizado x gap<br>Filtros por segmento<br>Mapa de calor por cidade | ⚠ Parcial | Saldo TO GO cobre budget vs realizado. Mapa por cidade precisa de engine de visualização geográfica. IBGE lookup existe. | Mapa de calor: definir lib (Mapbox/Leaflet) e confirmar se COD_MUNICIPIO_IBGE cobre os municípios necessários. |
| Fase 3 Analítica | Comparação multi-ano<br>Alertas de performance<br>Forecast e ajustes de budget | ✗ Ausente | Sem histórico persistido. Sem engine de alertas. Forecast está em `customer_forecasts` (a criar). | `faturamento_snapshots` resolve YoY. Alertas: definir regras de negócio antes de implementar. |
| Fase 4 Gamificação | Badges, troféus, conquistas<br>Trilhas de aprendizado<br>Desafios por meta | ✗ Ausente | Zero menção técnica em qualquer documento. Nenhum schema, nenhuma engine. | Spike de 1 sprint antes de implementar: modelo de eventos, schema de conquistas, integração com Pareto. |
| Fase 5 Escala | Onboarding multi-empresa<br>Parametrização por cliente<br>Múltiplos perfis | ✗ Ausente | Multi-tenancy não existe no schema atual. É refatoração de risco alto se feita retroativamente. | Adicionar `tenant_id` agora (Seção 5). Onboarding pode vir depois, mas a estrutura precisa existir no deploy. |

**Conclusão sobre o alinhamento do roadmap**
As Fases 1 e 2 estão ~60% cobertas tecnicamente. As lacunas são de schema (`customer_forecasts`, `faturamento_snapshots`), não de lógica de negócio.
A Fase 3 (analítica) depende inteiramente da criação de `faturamento_snapshots` — sem essa tabela, comparação YoY é impossível.
A Fase 4 (gamificação) está completamente sem âncora técnica. Precisa de spike antes da implementação.
A Fase 5 (escala) precisa de `tenant_id` no schema desde agora — não pode ser deixada para o final.

---

## 5. Estratégia de Multi-Tenancy
Nenhum dos 7 documentos técnicos menciona multi-tenancy, mas o roadmap de produto coloca onboarding multi-empresa na Fase 5. Esta seção define a estratégia para não inviabilizar essa fase.

### 5.1 Por que fazer agora (antes do deploy)
**Risco crítico se adiado:** Adicionar `tenant_id` retroativamente em produção significa: migração de dados existentes, reescrita de todas as queries, reconfiguração das RLS policies no Supabase e potencial quebra de Edge Functions.
Custo agora (pré-deploy): ~1 dia de trabalho. Custo depois (com dados reais): 1–2 semanas de risco alto.

### 5.2 Implementação Mínima Requerida
A implementação mínima não precisa incluir o fluxo de onboarding completo — apenas a estrutura que suporte a expansão futura sem refatoração:
1. Criar tabela `tenants`: [id UUID PK, nome TEXT, plano TEXT, created_at TIMESTAMPTZ]
2. Adicionar coluna `tenant_id UUID NOT NULL` em todas as tabelas de negócio (`customers`, `setup_budgets`, `customer_forecasts`, `faturamento_snapshots`, `it_se_configurations`, `scoring_weights`, `customer_faixas`, `official_safra_plans`)
3. Configurar RLS policies no Supabase: `CREATE POLICY 'tenant_isolation' ON customers USING (tenant_id = auth.jwt()->'tenant_id');`
4. Adicionar `tenant_id` ao JWT do usuário autenticado (Supabase Auth → custom claims).
5. Criar registro inicial em `tenants` para o cliente atual (cliente piloto).

### 5.3 O que NÃO precisa ser feito agora
* Interface de onboarding de novas empresas (Fase 5)
* Billing por tenant
* Configuração de portfólio por empresa
* Materiais de demonstração

---

## 6. Infraestrutura Revisada
O INFRASTRUCTURE.md está na versão V3 e contém uma inconsistência crítica: lista Vercel como 'Hobby/Pro' com custo R$0. Para um SaaS em produção com Edge Functions e SLA, o tier Pro é obrigatório.

### 6.1 Stack Revisada — Custo de Produção
| Serviço | Tier MVP | Custo Atual (est.) | Custo Prod. (est.) | Observação |
|---|---|---|---|---|
| Supabase | Pro | R$ 125/mês | R$ 125/mês | Mantido. RLS multi-tenant via policies. |
| Vercel | Hobby → Pro | R$ 0 | R$ ~100/mês | **CRÍTICO:** Hobby não tem SLA para Edge Functions em produção. |
| Upstash Redis | Free → Pay-as-you-go | R$ 0 | R$ ~20/mês | Free: 10k req/dia. Carteiras grandes podem exceder. |
| Resend | Free | R$ 0 | R$ 0 | Suficiente para notificações de aprovação. |
| **Total** | | **R$ 125/mês** | **R$ ~245/mês** | Orçamento revisado para produção. |

### 6.2 Decisões de Infra Pendentes
**Vercel Hobby não é adequado para produção:** Edge Functions no plano Hobby têm limite de 500k invocações/mês e sem SLA garantido. O processamento de CSVs via Edge (Memory-First Middleware) pode exceder esse limite com uso real.
Decisão requerida: confirmar upgrade para Vercel Pro antes do deploy de produção.

**Upstash Redis — plano free pode não ser suficiente:** Plano free: 10.000 requests/dia e 256MB de armazenamento. Uma carteira com 300+ clientes e múltiplos uploads diários pode exceder esse limite.
Recomendação: monitorar consumo nas primeiras 2 semanas de uso real e acionar Pay-as-you-go se necessário (custo marginal baixo).

---

## 7. Atualização das Regras do GEMINI.md
O GEMINI.md é o contrato de comportamento do copiloto de IA. As regras abaixo devem substituir ou complementar as existentes para refletir as decisões deste documento.

### 7.1 Regras a Adicionar
| Regra Nova / Atualizada | Justificativa |
|---|---|
| Sempre usar a fórmula VPM canônica da Seção 2 deste documento. NUNCA usar os aliases ITAA, ITAA_CULTURA ou Valor/ha. | Três nomenclaturas existentes causam risco de implementação inconsistente. |
| SEMPRE incluir `tenant_id` em toda nova tabela ou query que acesse dados de negócio. | Multi-tenancy precisa estar presente desde o início do schema. |
| Ao criar ou sugerir queries Supabase, SEMPRE incluir o filtro `.eq('tenant_id', tenantId)`. | Sem esse filtro, um tenant pode ver dados de outro — violação de segurança crítica. |
| A tabela `faturamento_snapshots` deve ser populada ao final de cada processamento transiente bem-sucedido. | Resolve YoY e dashboards gerenciais sem violar a regra de zero persistência de dados brutos. |
| Antes de implementar qualquer feature da Fase 4 (gamificação), exigir spike técnico documentado. | Gamificação não tem âncora técnica. Implementar sem spike gera débito técnico alto. |
| NUNCA deployar com Vercel Hobby. Confirmar plano Pro antes de qualquer deploy de produção. | Edge Functions têm limites não aceitáveis para SaaS em Hobby. |

### 7.2 Regras que Permanecem Inalteradas
* **Soberania de Dados:** NUNCA persistir dados brutos de faturamento.
* **Foco Comercial:** NUNCA implementar motores agronômicos (Embrapa, fases fenológicas).
* **Safe Math:** todos os cálculos financeiros em centavos (inteiros). Converter apenas na exibição.
* **Offline-First:** TanStack Query para fluxos de campo.
* **Rich Aesthetics:** padrão Morning Dew, Glassmorphism, tokens de design em `globals.css`.

---

## 8. Plano de Ação — Próximas Semanas
Ações ordenadas por prioridade e dependência. Devem ser executadas antes do deploy de produção na Fase 5.

| # | Prioridade | Ação | Resultado Esperado | Semana |
|---|---|---|---|---|
| 1 | P0 — CRÍTICO | Criar tabela `tenants` e adicionar `tenant_id` em todas as tabelas de negócio. Configurar RLS policies no Supabase. | Schema multi-tenant pronto para produção sem refatoração futura. | Sem. 9 |
| 2 | P0 — CRÍTICO | Criar tabela `customer_forecasts` [tenant_id, documento, mes, segmento, valor_previsto_centavos]. Adicionar validação vs setup_budgets. | Fase 1 do roadmap de produto fica 100% coberta (edição de meta por cliente). | Sem. 9 |
| 3 | P0 — CRÍTICO | Criar tabela `faturamento_snapshots` e populá-la ao final de cada processamento transiente. | Resolve YoY (Fase 3), dashboards gerenciais (Fase 2) e auditoria de histórico. | Sem. 9 |
| 4 | P1 — ALTO | Finalizar refinamento da interface do Saldo TO GO (único item pendente da Fase 4 do ROADMAP.md). | Fase 4 técnica 100% concluída. Produto pronto para homologação. | Sem. 9 |
| 5 | P1 — ALTO | Especificar integração ERP Rating: qual sistema, endpoint, formato, responsável de acesso. | Desbloquear item de semana 10. Sem spec, o item entra bloqueado. | Sem. 9 |
| 6 | P1 — ALTO | Confirmar Vercel Pro e atualizar INFRASTRUCTURE.md para versão V4 com custos reais de produção. | Orçamento correto para os sócios. SLA adequado para Edge Functions. | Sem. 9 |
| 7 | P2 — MÉDIO | Sincronizar WALKTHROUGH.md com estado real: marcar Saldo TO GO como pendente e adicionar data de atualização. | Documentação consistente para onboarding de novos devs ou stakeholders. | Sem. 10 |
| 8 | P2 — MÉDIO | Definir critérios de aceite da homologação final: lista de cenários de teste com resultado esperado. | Homologação com Definition of Done. Evita lista crescente de ajustes sem fim. | Sem. 10 |
| 9 | P3 — PLANEJAMENTO | Sprint de spike para Fase 4 (gamificação): modelo de eventos, schema de conquistas, integração com Pareto. | Gamificação com âncora técnica. Evita débito técnico e improviso. | Sem. Pós-deploy |

---

## 9. Glossário — Termos Canônicos
Use sempre os termos da coluna 'Termo Canônico'. Os aliases listados existem nos documentos antigos mas estão deprecados.

| Termo Canônico | Aliases Deprecados | Definição |
|---|---|---|
| **VPM** (Value Potential Mapping) | Wallet Share, Potencial, Share de Acesso | Potencial financeiro total de um cliente: Σ(HA × IT-SE × Fator_Safra). Unidade: centavos. |
| **IT-SE** (Índice Técnico por Segmento) | ITAA, ITAA_CULTURA, Valor/ha, Coeficiente | Valor em R$/ha por cultura e segmento comercial, configurável por safra. Tabela: `it_se_configurations`. |
| **setup_budgets** | Setup Budget, Meta CTV, Budget | Meta financeira top-down por [tenant_id, mes, id_ctv, segmento]. Definida pelo gestor. |
| **customer_forecasts** | sales_forecasts, Previsão, Promessa Comercial | Previsão bottom-up por [tenant_id, documento, mes, segmento]. Definida pelo vendedor por cliente. |
| **faturamento_snapshots** | (não existia) | Agregado imutável mensal do faturamento realizado. Criado ao final de cada processamento transiente. |
| **Saldo TO GO** | Gap Comercial, Saldo | `setup_budget − Σ(sales_results_ytd)` para o mês vigente. Motor: Saldo_TO_GO_Engine. |
| **Régua de Confiança / Pareto** | Pareto Comercial, Cores, Faixas | Classificação de clientes em Azul/Verde/Amarelo/Vermelho baseada em VPM, Wallet Share, Rating e Relacionamento. |
| **Handshake** | Congelamento, Snapshot, Aprovação | Processo de materialização e aprovação do plano comercial. Gera registro imutável em `official_safra_plans`. |
| **Memory-First / Zero Footprint** | Processamento Transiente, Soberania de Dados | Dados brutos do ERP processados em RAM e descartados. Apenas agregados e indicadores são persistidos. |
| **tenant_id** | (não existia) | UUID que identifica a empresa cliente do SaaS. Presente em todas as tabelas de negócio para isolamento de dados. |

────────────────────────────────────────────────────────────
*Documento gerado em: quinta-feira, 21 de maio de 2026*
*Fontes analisadas: PRD.md · ARCHITECTURE.md · GEMINI.md · Especificacao_Tecnica_Blueprint_V4.md · INFRASTRUCTURE.md · ROADMAP.md · WALKTHROUGH.md*
*Próxima revisão recomendada: Após deploy de produção (Semana 10) ou quando houver decisão arquitetural que altere schema, fórmulas ou roadmap.*
