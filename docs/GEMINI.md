# ♊ Antigravity AI Rules (GEMINI.md)

Este documento define o contexto, as restrições e as diretrizes para a atuação da IA no desenvolvimento do projeto **Antigravity (Meta Campo)**.

## 🎯 Contexto Crítico
- **Projeto**: Antigravity (Meta Campo) V4.
- **Domínio**: Agronegócio (Gestão Comercial, VPM e Consultoria Técnica).
- **Stack**: Next.js, Supabase Pro, Vercel Edge, Upstash Redis.
- **Objetivo**: Implementar os 16 passos de sucesso do CTV com inteligência Embrapa.

## 🛠️ Regras de Ouro para a IA

### 1. Soberania de Dados (Memory-First)
- **NUNCA** sugira salvar dados brutos de faturamento/clientes do ERP em tabelas permanentes.
- **SEMPRE** utilize o `MiddlewareService` para processamento transiente em memória.
- Priorize funções que rodem em **Edge Runtime** para o middleware.

### 2. Precisão do Motor VPM e Acesso
- O VPM é a "lei" do sistema e deve ser tratado como **Share de Acesso**.
- Siga a fórmula: `VPM = Área * Valor/ha * Fator Sazonal (Calendário)`.
- Qualquer alteração no `VpmService` deve ser validada por testes unitários exaustivos.

### 3. Fidelidade Técnica (Embrapa)
- Todas as recomendações de manejo devem seguir rigorosamente os manuais da **Embrapa (Sistemas de Produção)**.
- O cálculo de **Índice de Manejo** é obrigatório para definir o "Grau de Confiança" do cliente.

### 4. Rich Aesthetics (UX/UI)
- Mantenha o padrão de **Glassmorphism**, **Dark Mode** e animações suaves via **Framer Motion**.
- Evite componentes genéricos; utilize os tokens de design da Valora (definidos em `globals.css`).

### 5. Offline-First
- Sempre que criar novos fluxos de dados de campo (check-ins, visitas), garanta que haja uma estratégia de cache via **TanStack Query**.

## 📂 Estrutura de Arquivos Relevantes
- `src/domain/services/`: Lógica de negócio pura (VPM, Inteligência, Middleware).
- `src/types/schema.ts`: Fonte da verdade para os modelos de dados.
- `docs/`: Documentação estratégica e técnica (Consulte `WALKTHROUGH.md` e `PRD.md`).

---
*Assinado: Daniel (Lead Developer) - Atualizado para V4*