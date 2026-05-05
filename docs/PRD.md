# PRD: Antigravity (Meta Campo) - V4 (Consolidada)

**Versão**: 4.0 (Inteligência Técnica Embrapa)
**Status**: Em Desenvolvimento (MVP - Semana 3)
**Responsável**: Antigravity AI (Daniel)

---

## 1. Visão Estratégica
O **Antigravity (Meta Campo)** evoluiu de um simulador financeiro para um **Motor de Consultoria Técnica**. O potencial agora é definido como **Share de Acesso** (Wallet Share), onde o sucesso é medido pela captura do "Acesso Disponível" do cliente, utilizando as diretrizes técnicas da **Embrapa (Sistemas de Produção 17)** como régua de excelência.

## 2. Metodologia: Os 16 Passos (Evolução V4)
O sistema automatiza a jornada de sucesso com foco em inteligência técnica:
- **Passos 1-3 (Acesso & VPM)**: Materialização de áreas vs. tetos IBGE (PAM) e calibragem de potencial financeiro.
- **Passos 4-11 (Manejo Embrapa)**: Inclusão do **Índice de Manejo**. O sistema rastreia estádios fenológicos (V/R) e calcula o Gap de Acesso Técnico (Dose Real vs. Recomendada).
- **Passos 12-13 (Régua de Confiança)**: A cor do cliente é influenciada pelo Gap de Manejo. Gap > 20% torna o cliente Amarelo/Vermelho automaticamente.
- **Passos 14-16 (Execução Tática)**: Market Share municipal (Dona da Rua) e Planos de Visita priorizados por risco técnico e valor (Pareto).

## 3. Arquitetura: Middleware Transiente & Motor de Manejo
- **Soberania de Dados**: Processamento Memory-First via Vercel Edge Runtime.
- **Motor de Manejo**: Tabela de referência `ref_tecnica_soja` (Base Embrapa) para cálculo de volume necessário por estádio.
- **Escalabilidade**: Arquitetura pronta para expansão dos motores de **Milho** e **Algodão** (Fase 5).

## 4. Requisitos de Inteligência (V4)
- **Benchmarking IBGE**: Validação de território para evitar "hectares fantasmas".
- **Gatilhos Fenológicos**: Alertas de oportunidade de venda baseados na fase da lavoura.
- **Pareto de Acesso**: Priorização de clientes com maior gap de faturamento vs. potencial técnico.

## 5. Matriz de Riscos e Mitigação (Revisada)
| Risco | Impacto | Mitigação |
| :--- | :--- | :--- |
| Vazamento de Dados ERP | Crítico | Estratégia Memory-First; descarte imediato de dados brutos. |
| Inconsistência Técnica | Alto | Calibragem rigorosa com manuais Embrapa SP-17. |
| Dados Geográficos Sujos | Médio | Normalização automática de municípios para códigos IBGE no Middleware. |

## 6. Cronograma de 10 Semanas (Revisado V4)
1. **Semanas 1-2**: Setup, Modelagem e Tabelas Combo (Concluído).
2. **Semanas 3-5**: Motor de VPM, Janelas Agrícolas e Inteligência IBGE (Concluído).
3. **Semanas 6-8**: Middleware Transiente, Motor de Manejo Soja e Planos de Visita (Concluído).
4. **Semanas 9-10**: Expansão para Milho/Algodão e Homologação Final.

---
*Status: Transformando intuição comercial em ciência de mercado.*
