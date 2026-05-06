# Antigravity Blueprint V4 - Especificação Técnica Unificada

Este documento consolida a visão estratégica e técnica para o desenvolvimento do MVP do Antigravity AI, integrando a lógica de negócio do Excel com a arquitetura de software escalável.

---

## 1. Metodologia: O Cockpit de Execução (16 Passos)

O sistema automatiza a jornada de sucesso do CTV, transformando dados de território em inteligência consultiva técnica baseada nos manuais da Embrapa.

- **Diagnóstico:** Validação de VPM (Value Potential Mapping) vs Meta.
- **Planejamento:** Mapeamento de áreas reais e definição de Share de Acesso.
- **Execução:** Monitoramento de Gap Técnico e Forecast "TO GO".
- **Governança:** Handshake e congelamento da estratégia para auditoria.

---

## 2. Plano de Telas (UX/UI Dynamic Flow)

| Módulo | Inputs Principais | Outputs e Lógica |
| :--- | :--- | :--- |
| **1. Admin (Setup)** | IT-SE ($/ha), Pesos de Scoring. | Cálculo do DNA Financeiro e Régua de Cores (Pareto). |
| **2. Diagnóstico CTV** | Meta de Vendas, Share Alvo %. | Velocímetro de viabilidade e VPM Necessário. |
| **3. Tabela Mãe (MVP)** | Upload CSV ou Adição Manual (Nome, Área, Cultura). | Cálculo automático de VPM Individual e Share Realizado. |
| **4. Drill-Down** | Previsão por Segmento (Sementes, Fert, etc). | Validação contra teto técnico e alertas de mix de portfólio. |
| **5. Cockpit Financeiro** | Realizado YTD (via Ingestão Memory-First). | Saldo "TO GO", Projeção de Forecast e Alertas de Gap. |
| **6. Gestão de Campo** | Frequência de Visitas por cor. | Agenda prioritária baseada em Valor e Risco Técnico. |

---

## 3. Modelo de Dados (Schema Relacional)

Estrutura desenhada para o Supabase, garantindo integridade e performance.

### Tabelas de Setup
- **`it_se_configurations`**: Armazena o valor por hectare/segmento/safra.
- **`scoring_weights`**: Define a importância dos critérios para a nota do cliente.

### Tabelas de Planejamento
- **`customers` & `customer_crop_areas`**: Cadastro de fazendas e hectares plantados.
- **`sales_forecasts`**: A promessa comercial detalhada por segmento.

### Tabelas de Execução
- **`sales_results_ytd`**: Faturamento consolidado (Processamento transiente).
- **`customer_faixas`**: Resultado do motor de Pareto (Cores).
- **`official_safra_plans`**: Snapshot imutável para o Handshake (Governança).

---

## 4. Arquitetura de API e Segurança

- **Implementação do protocolo Memory-First:** Execução via Vercel Edge Runtime.
- **Ingestão Transiente:** Dados brutos do ERP são processados em RAM e descartados imediatamente após a consolidação dos indicadores.
- **API de Validação:** Cross-check com base IBGE para evitar "hectares fantasmas".
- **Workflow API:** Gestão de estados (Pending Review -> Approved) com bloqueio de edição.

---

## 5. Dinâmica MVP: Flexibilidade no Campo

O sistema suporta a importação massiva de dados via planilha para o setup inicial, mantendo a opção de adição manual de novos clientes e áreas diretamente na interface, garantindo um planejamento tático vivo e dinâmico.
