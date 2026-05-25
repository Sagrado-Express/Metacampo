# 📋 Backlog de Produto — MetaCampo / Antigravity V4

Este documento centraliza todos os itens de trabalho, histórias de usuários e tarefas técnicas necessárias para o desenvolvimento do motor de Inteligência Comercial e Financeira **MetaCampo (Antigravity V4)**, focado em Wallet Share, VPM (Value Potential Mapping), Saldo "TO GO" e esteira final de Go-Live.

---

## 🚀 Visão Geral do Backlog

O backlog está organizado em **9 Fases principais**, cobrindo o setup técnico, o motor de inteligência e janelas agrícolas, o processamento de faturamento memory-first, os workspaces analíticos de vendas, a governança multi-tenant e a esteira de integração, piloto, segurança e Go-Live sistêmico.

### Legenda de Prioridades:
*   🔥 **Crítica (P0):** Bloqueante para o MVP, integração e governança básica de dados.
*   ⭐ **Alta (P1):** Essencial para a experiência do usuário, sincronismo e tomada de decisão comercial.
*   📈 **Média (P2):** Importante para refinamento analítico, operacional e segurança de borda.
*   🌱 **Baixa (P3):** Melhorias futuras, gamificação ou automações complementares.

---

## 🗂️ Detalhamento dos Épicos e Histórias

### FASE 1 — Setup & Modelagem (Semanas 1–2)
Foco em estruturar a base da aplicação Next.js, as tabelas essenciais no Supabase e o design system premium.

| ID | Story / Tarefa | Descrição | Prioridade | Pontos | Status |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **MC-101** | Setup do Next.js & Supabase | Bootstrapping do projeto com Next.js (App Router), TypeScript e Tailwind CSS, configurando o client Supabase. | 🔥 Crítica | 5 | ✅ Concluído |
| **MC-102** | Schema de Banco de Dados V1 | Criação das tabelas base no Supabase para Clientes (`customers`), Áreas (`customer_crop_areas`) e logs de Auditoria. | 🔥 Crítica | 5 | ✅ Concluído |
| **MC-103** | Design System Premium | Implementação do design system baseado em Glassmorphism, paleta Morning Dew e tokens em `globals.css`. | ⭐ Alta | 8 | ✅ Concluído |
| **MC-104** | Dashboard Shell & Navegação | Desenvolvimento da interface de navegação principal (Sidebar, Header, Layout responsivo) e sistema de rotas. | ⭐ Alta | 8 | ✅ Concluído |

---

### FASE 2 — Motor VPM & Janelas Agrícolas (Semanas 3–5)
Foco na lógica matemática de potencial de mercado por hectare plantado e variação sazonal de culturas.

| ID | Story / Tarefa | Descrição | Prioridade | Pontos | Status |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **MC-201** | Cálculo de VPM Canônico | Implementação da fórmula: `VPM = Σ (HA_Cultura × IT-SE_Cultura_Segmento × Fator_Safra)`. Utilização de centavos (Safe Math). | 🔥 Crítica | 13 | ✅ Concluído |
| **MC-202** | Materialização de Áreas | Normalização e cruzamento de hectares de clientes vs. tetos municipais do IBGE PAM para evitar distorções de área. | 🔥 Crítica | 8 | ✅ Concluído |
| **MC-203** | Interface de Janelas Agrícolas | Painel para visualização e gerenciamento dos fatores sazonais por safra de culturas como soja, milho, algodão, cana e café. | ⭐ Alta | 5 | ✅ Concluído |
| **MC-204** | Testes de VPM (Golden Master) | Criação de suíte de testes automatizados para garantir a precisão matemática do motor VPM contra desvios de cálculo. | ⭐ Alta | 5 | ✅ Concluído |

---

### FASE 3 — Middleware Transiente & Auditoria (Semanas 6–7)
Garantia de soberania de dados através de processamento em memória e trilha de auditoria criptográfica.

| ID | Story / Tarefa | Descrição | Prioridade | Pontos | Status |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **MC-301** | Parser de CSV Edge-Ready | Motor de importação híbrido rodando no Vercel Edge Runtime para processar arquivos ERP pesados com baixo consumo. | 🔥 Crítica | 8 | ✅ Concluído |
| **MC-302** | Memory-First (Zero Persistência) | Garantir que dados de faturamento brutos do ERP sejam processados em memória RAM e descartados, sem armazenamento físico. | 🔥 Crítica | 8 | ✅ Concluído |
| **MC-303** | Auditoria Imutável | Geração de logs assinados e históricos não-editáveis de todas as operações de importação e recalculo no sistema. | ⭐ Alta | 5 | ✅ Concluído |
| **MC-304** | Normalização de Municípios | Validação automática e conversão de nomes de cidades brasileiras para os códigos oficiais do IBGE no middleware. | 📈 Média | 3 | ✅ Concluído |

---

### FASE 4 — Inteligência Comercial (Semana 8)
Visualização unificada de vendas, análise de Pareto (Curva ABC) e planos táticos de visitas a campo.

| ID | Story / Tarefa | Descrição | Prioridade | Pontos | Status |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **MC-401** | Workspaces Integrados de Planejamento | Dashboard unificado integrando os recortes de diretores, gerentes, CTVs (vendedores) e carteira detalhada. | 🔥 Crítica | 13 | ✅ Concluído |
| **MC-402** | Régua de Confiança & Pareto | Classificação de clientes em cores (Azul, Verde, Amarelo, Vermelho) cruzando VPM, Wallet Share, Crédito e Relacionamento. | 🔥 Crítica | 8 | ✅ Concluído |
| **MC-403** | Motor de Planos de Visitas | Geração automática de roteiros de visitas priorizados por potencial financeiro (Pareto) e nível de risco comercial. | ⭐ Alta | 8 | ✅ Concluído |
| **MC-404** | Refinamento da UI do Saldo "TO GO" | Polimento estético do gap Meta vs. Realizado + Pedidos Pendentes, permitindo filtros interativos no dashboard. | ⭐ Alta | 5 | ✅ Concluído |

---

### FASE 5 — Expansão Comercial & Governança (Semanas 9–10)
Abertura para escala comercial através de arquitetura multi-tenant, persistência histórica agregada e homologação.

| ID | Story / Tarefa | Descrição | Prioridade | Pontos | Status |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **MC-501** | Arquitetura Multi-Tenancy (P0) | Criação da tabela `tenants`, coluna `tenant_id` em todas as tabelas de negócio e regras de RLS no Supabase para isolar dados. | 🔥 Crítica | 13 | ✅ Concluído |
| **MC-502** | Tabela de Forecast por Cliente (P0) | Criar tabela `customer_forecasts` permitindo ao CTV prever metas por cliente, com validação agregada vs `setup_budgets`. | 🔥 Crítica | 10 | ✅ Concluído |
| **MC-503** | Snapshots YoY de Faturamento (P0) | Criar a tabela `faturamento_snapshots` e populá-la pós-processamento transiente para permitir análises históricas multi-ano. | 🔥 Crítica | 10 | ✅ Concluído |
| **MC-504** | Integração com Rating ERP | Conectar o motor à base externa de crédito e relacionamento para automação da régua de confiança e risco comercial. | ⭐ Alta | 8 | ✅ Concluído |
| **MC-505** | Dashboard de Market Share | Painel analítico "Dona da Rua" mostrando a cobertura percentual da empresa em cada município de atuação. | 📈 Média | 8 | ✅ Concluído |
| **MC-506** | Deploy em Produção | Migração do ambiente para instâncias de produção (Vercel Pro, Upstash Redis Pay-As-You-Go e chaves Supabase oficiais). | 🔥 Crítica | 5 | ✅ Concluído |
| **MC-507** | Homologação & Critérios de Aceite | Validação de ponta a ponta com dados reais do cliente piloto sob cenários definidos de estresse e performance de carregamento. | ⭐ Alta | 5 | ✅ Concluído |

---

### FASE 6 — Integração Sistêmica & Sincronismo ERP (Semanas 11–12) — [❌ CANCELADA]
*Fase cancelada por decisão estratégica. O sistema manterá o processamento de arquivos CSV via Ingestão Transiente e Memory-First, que já atende com excelência à operação atual sem necessidade de integrações ativas de APIs externas de ERPs SAP e Totvs.*

| ID | Story / Tarefa | Descrição | Prioridade | Pontos | Status |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **MC-601** | Pipeline Real-Time ERP | Estabelecer integradores Webhook e buffers de API para sincronizar faturamentos diretamente de SAP e Totvs. | 🔥 Crítica | 13 | ❌ Cancelado |
| **MC-602** | Motor de Filas Redis | Configuração de fila assíncrona baseada em Upstash Redis / BullMQ para suportar picos de chamadas de sincronismo ERP. | ⭐ Alta | 8 | ❌ Cancelado |
| **MC-603** | Dashboard de Monitoramento | Painel visual de integridade para a equipe de TI visualizar a data do último sync, erros de fila e status das conexões de API. | 📈 Média | 5 | ❌ Cancelado |

---

### FASE 7 — Piloto Controlado & Homologação de Campo (Semanas 13–14)
Fase de homologação operacional em campo com um grupo focal de CTVs para validação da experiência do usuário.

| ID | Story / Tarefa | Descrição | Prioridade | Pontos | Status |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **MC-701** | Onboarding & Teste Piloto | Deploy inicial restrito e acompanhado para 10 CTVs e 2 Gerentes regionais de teste em ambiente beta. | 🔥 Crítica | 8 | 🔲 Planejado |
| **MC-702** | UX Feedback Refinements | Refinar layouts de sliders de gap, visualizações mobile e o drawer de Churn baseados no feedback dos pilotos de campo. | ⭐ Alta | 5 | 🔲 Planejado |
| **MC-703** | Stress-Test de Concorrência | Simular estresse de carga de 500 requisições simultâneas de geolocalização e roteamento no Edge Runtime. | 📈 Média | 5 | 🔲 Planejado |

---

### FASE 8 — Segurança, Compliance & LGPD (Semana 15)
Blindagem de dados e conformidade do sistema de simulação de carteira com os marcos regulatórios de privacidade.

| ID | Story / Tarefa | Descrição | Prioridade | Pontos | Status |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **MC-801** | Mascaramento de Dados LGPD | Criptografia em repouso e mascaramento visual de dados de CPF, CNPJ e contatos diretos de produtores agrícolas na UI. | 🔥 Crítica | 8 | 🔲 Planejado |
| **MC-802** | Audit de Segurança (PenTest) | Executar auditorias estáticas e testes de injeção externa contra acessos não autorizados entre tenants no Supabase. | ⭐ Alta | 5 | 🔲 Planejado |

---

### FASE 9 — Go-Live & Monitoramento de Operação (Semana 16)
Implantação geral, treinamento de larga escala da equipe comercial e monitoramento de logs em tempo real.

| ID | Story / Tarefa | Descrição | Prioridade | Pontos | Status |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **MC-901** | Transição de DNS & Cutover | Migrar a aplicação Vercel para o domínio oficial da empresa e virar chaves Supabase definitivas. | 🔥 Crítica | 8 | 🔲 Planejado |
| **MC-902** | Treinamento Comercial | Realizar workshops práticos e disponibilizar vídeo-tutoriais sobre o planejamento de gap de vendas e dominância. | ⭐ Alta | 5 | 🔲 Planejado |
| **MC-903** | Monitoramento Proativo | Configurar Sentry e Datadog para detecção precoce de latência nas Edge Functions e quedas nas chamadas de banco de dados. | ⭐ Alta | 5 | 🔲 Planejado |

---

## 📊 Métricas de Esforço do Escopo

*   **Total de Histórias/Tarefas:** 30 itens
*   **Esforço Estimado Total (Ativo):** 191 pontos de história
*   **Concluído (✓):** 19 itens (144 pontos — 75% do esforço ativo)
*   **Pendente (🔲):** 8 itens (47 pontos — 25% do espaço ativo)
*   **Cancelado (❌):** 3 itens (26 pontos de esforço)

> **Nota:** Este backlog reflete as especificações canônicas acordadas no Documento Mestre de Alinhamento (MASTER_ALIGNMENT.md) e estende o escopo técnico do projeto até a entrega final em produção corporativa.

*Atualizado em 2026-05-25 pela equipe Antigravity AI.*
