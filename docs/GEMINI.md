# ♊ Antigravity AI Rules (GEMINI.md)

Este documento define o contexto, as restrições e as diretrizes para a atuação da IA no desenvolvimento do projeto **Antigravity (Meta Campo)**.

## 🎯 Contexto Crítico
- **Projeto**: Antigravity (Meta Campo) V4.
- **Domínio**: Agronegócio (Gestão Comercial, VPM e Consultoria Técnica).
- **Stack**: Next.js, Supabase Pro, Vercel Edge, Upstash Redis.
- **Objetivo**: Implementar os 16 passos de sucesso do CTV com foco exclusivo em Inteligência Comercial e Financeira.

## 🛠️ Regras de Ouro para a IA

### 1. Soberania de Dados (Memory-First)
- **NUNCA** sugira salvar dados brutos de faturamento/clientes do ERP em tabelas permanentes.
- **SEMPRE** utilize o `MiddlewareService` para processamento transiente em memória.
- Priorize funções que rodem em **Edge Runtime** para o middleware.
- A tabela `faturamento_snapshots` deve ser populada ao final de cada processamento transiente bem-sucedido.

### 2. Precisão do Motor VPM e Acesso
- O VPM é a "lei" do sistema e deve ser tratado como **Share de Acesso**.
- **Sempre usar a fórmula VPM canônica:** `VPM_Cliente = Σ (HA_Cultura × IT-SE_Cultura_Segmento × Fator_Safra_Vigente)`. NUNCA usar os aliases ITAA, ITAA_CULTURA ou Valor/ha.
- Qualquer alteração no `VpmService` deve ser validada por testes unitários exaustivos.

### 3. Foco Comercial Exclusivo
- **NUNCA** implemente ou sugira motores agronômicos (como regras da Embrapa ou fases fenológicas).
- O sucesso do cliente é medido por **VPM, Wallet Share, Rating de Crédito e Saldo "TO GO"**.

### 4. Rich Aesthetics (UX/UI)
- Mantenha o padrão **Morning Dew**: Light Mode Premium, Glassmorphism suave (white/70), e tons de Verde Clorofila e Café.
- Utilize os tokens de design definidos em `globals.css` (Premium Glass cards).

### 5. Segurança Financeira (Safe Math)
- **Obrigatório**: Todo cálculo que envolva R$ (Reais) ou Hectares deve ser feito em **Centavos/Inteiros** para evitar erros de ponto flutuante.
- Utilize `Math.round(val * 100) / 100` apenas na saída visual; o processamento interno deve ser rigoroso.

### 6. Offline-First
- Sempre que criar novos fluxos de dados de campo (check-ins, visitas), garanta que haja uma estratégia de cache via **TanStack Query**.

### 7. Multi-Tenancy e Isolamento de Dados
- **SEMPRE** incluir `tenant_id` em toda nova tabela ou query que acesse dados de negócio.
- Ao criar ou sugerir queries Supabase, **SEMPRE** incluir o filtro `.eq('tenant_id', tenantId)` para garantir isolamento de dados.

### 8. Gamificação (Fase 4)
- Antes de implementar qualquer feature da Fase 4 (gamificação), é obrigatório exigir um spike técnico documentado.

### 9. Infraestrutura de Produção
- **NUNCA** deployar com Vercel Hobby. Confirmar plano Pro antes de qualquer deploy de produção devido aos limites de Edge Functions.

## 📂 Estrutura de Arquivos Relevantes
- `src/domain/services/`: Lógica de negócio pura (VPM, Inteligência, Middleware).
- `src/types/schema.ts`: Fonte da verdade para os modelos de dados.
- `docs/`: Documentação estratégica e técnica (Consulte `WALKTHROUGH.md` e `PRD.md`).

---
*Assinado: Daniel (Lead Developer) - Atualizado para V4*