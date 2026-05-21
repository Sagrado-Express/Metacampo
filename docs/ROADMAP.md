# Roadmap do Produto: Antigravity (MetaCampo V4)

Este documento consolida o **Roadmap de Produto** e o plano de execução focado na entrega funcional da Inteligência Comercial e Soberania de Dados.

---

## Fase 1 — MVP de Planejamento Comercial (Semanas 1-2)
**Objetivo:** Entregar a tela principal do vendedor e validar a lógica de distribuição de metas.

### 🎯 Entregas & Capacidades
- Tela de gestão do vendedor (Dashboard Shell & Nav System).
- Lista de clientes por recorte.
- Histórico do ano anterior (Implementado via `faturamento_snapshots`).
- Edição de meta por cliente (`customer_forecasts`).
- Ordenação por valor e share.
- Status por cores (Matriz de Pareto com Pilares Comerciais).
- Parametrização das faixas de cor.
- Cálculo de share projetado.

### 💡 Resultado Esperado
- Vendedor consegue distribuir metas sem planilha.
- Gestor enxerga rapidamente onde estão os gaps.
- Validação da proposta principal do produto.

### 🛠️ Status Técnico
- **Status:** CONCLUÍDO (Design System Glassmorphism, Schema Bootstrap, Lógicas Iniciais).

---

## Fase 2 — Consolidação Gerencial (Semanas 3-5)
**Objetivo:** Ampliar a visão para líderes e dar mais contexto ao acompanhamento.

### 🎯 Entregas & Capacidades
- Dashboard executivo básico.
- Visão por gerente e equipe.
- Ranking de vendedores.
- Orçamento x realizado x gap (Saldo "TO GO").
- Filtros consolidados por segmento/categoria.
- Mapa de cobertura / calor por cidade (Lookup IBGE PAM integrado).

### 💡 Resultado Esperado
- Liderança acompanha performance de forma centralizada.
- Produto passa a servir também gestão regional e diretoria.

### 🛠️ Status Técnico
- **Status:** CONCLUÍDO (Motor de VPM, Janelas Agrícolas, Testes Unitários Golden Master).

---

## Fase 3 — Expansão Analítica (Semanas 6-7)
**Objetivo:** Tornar a plataforma mais inteligente e flexível para análise comercial.

### 🎯 Entregas & Capacidades
- Comparação com múltiplos anos.
- Alertas avançados de performance.
- Análises por cliente, cultura, segmento e portfólio.
- Forecast e ajustes de budget.
- Visões mais avançadas de produtividade.

### 💡 Resultado Esperado
- Plataforma vira ferramenta de decisão e não só de planejamento.
- Aprofundamento da análise comercial.

### 🛠️ Status Técnico
- **Status:** CONCLUÍDO (Parser CSV Edge Ready, Auditoria Imutável, Processamento Memory-First / Zero Footprint).

---

## Fase 4 — Gamificação e Engajamento (Semana 8)
**Objetivo:** Aumentar adoção e recorrência de uso.

### 🎯 Entregas & Capacidades
- Badges, troféus e conquistas.
- Trilhas de aprendizado.
- Conteúdo comercial por produto.
- Desafios por meta e desempenho.
- Experiência estilo game para vendedores.

### 💡 Resultado Esperado
- Maior engajamento do time.
- Uso contínuo da plataforma ao longo do ano.

### 🛠️ Status Técnico
- **Status:** EM ANDAMENTO (Spike Técnico Necessário conforme *MASTER_ALIGNMENT.md*). 
- **Pendências:** Refinamento do Saldo "TO GO" na interface; Criação do modelo de eventos e schemas de conquista.

---

## Fase 5 — Comercialização e Escala (Semanas 9-10)
**Objetivo:** Preparar o produto para vender para novas contas e escalar.

### 🎯 Entregas & Capacidades
- Onboarding de novas empresas.
- Parametrização por cliente (Schema Multi-Tenant implementado).
- Camada de configuração de portfólio.
- Estrutura para múltiplos perfis de negócio.
- Materiais de pré-lançamento e demonstração.

### 💡 Resultado Esperado
- Produto pronto para expansão comercial.
- Implantação mais rápida em novos clientes.

### 🛠️ Status Técnico
- **Status:** NÃO INICIADA.
- **Pendências:** Integração com base de Rating ERP, Homologação Final, Dashboard de Market Share e Deploy em Produção (Vercel Pro).

---

*Status consolidado em: 21/05/2026 (Alinhado com MASTER_ALIGNMENT.md)*
