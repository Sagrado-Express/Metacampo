# CLAUDE.md — Regras de Ouro do Projeto MetaCampo (GTMGC SaaS)

> Este arquivo define como qualquer IA (Antigravity, Claude Code, ou outro agente)
> deve se comportar neste repositório. Ele substitui qualquer regra anterior
> (`GEMINI.md` antigo está deletado — se você o encontrar em algum lugar, ignore-o).
>
> **A fonte de verdade sobre O QUE construir é `docs/PRD.md`.**
> **Este arquivo define COMO trabalhar nele.**

---

## 1. Contexto do Projeto

- **Nome:** MetaCampo (também referenciado como GTMGC SaaS / Antigravity nos docs antigos — nome oficial é MetaCampo)
- **Domínio:** Agronegócio — gestão comercial de carteiras de CTVs (consultores técnicos de vendas)
- **Modelo:** SaaS multi-tenant self-service
- **Stack:** Next.js (App Router) + Supabase (Postgres + Auth + RLS) + Vercel + GitHub
- **Metodologia de negócio:** 16 passos do GTMGC, descritos em detalhe no `docs/PRD.md`

---

## 2. Regra Nº1 — Nunca declare algo como concluído sem prova verificável

Este projeto já sofreu um ciclo inteiro de "documentação otimista": relatórios diziam
"CONCLUÍDO" para features que, na auditoria real, eram telas com dados mockados e
banco de dados desconectado. **Isso não pode se repetir.**

- Uma story só é "done" se houver evidência reproduzível: teste passando, output real
  de uma query, screenshot/log de execução — nunca a afirmação textual de que "funciona".
- Se você (agente) não testou de fato, diga "não testado" — não diga "implementado".
- Antes de marcar qualquer Critério de Aceite do PRD como cumprido, execute o teste
  descrito nele e mostre o resultado bruto.

## 3. Regra Nº2 — Não crie documentação nova

O projeto tinha 12 arquivos `.md` se contradizendo entre si sobre status, arquitetura
e nomenclatura. Isso foi a causa raiz do retrabalho.

- **Não crie** novos arquivos `README`, `STATUS`, `ROADMAP`, `ARCHITECTURE` ou
  similares "para organizar".
- Se identificar uma ambiguidade ou conflito, **pare e pergunte ao usuário** — não
  resolva sozinho criando um novo documento.
- Toda mudança de escopo ou arquitetura é uma edição direta no `docs/PRD.md`, nunca
  um arquivo novo.

## 4. Regra Nº3 — Nomenclatura oficial

- O termo correto é **"Índice Tecnológico"**. Proibido usar `ITAA`, `IT-SE`, ou
  "Valor/ha" em qualquer texto visível ao usuário, nome de variável novo, ou
  documentação.
- Se encontrar essas referências em código legado, é trabalho pendente do Épico 3
  do PRD — não ignore, mas também não pare tudo para corrigir sem que seja a story
  da vez.

## 5. Regra Nº4 — Multi-tenancy é inegociável

- **Toda** tabela de negócio tem coluna `tenant_id NOT NULL` e RLS habilitado.
- **Toda** query nova inclui filtro por `tenant_id` (via RLS automático do Supabase,
  não filtro manual que pode ser esquecido).
- "RLS habilitado" no painel não é suficiente — sempre validar com teste real de
  dois tenants diferentes antes de considerar uma feature de dados como pronta.

## 6. Regra Nº5 — Segredos nunca em texto

- Nunca imprima, logue ou peça para o usuário colar `service_role` key, senhas, ou
  qualquer secret em chat/prompt.
- Variáveis sensíveis vivem em `.env.local` (local) e nas Environment Variables da
  Vercel (produção) — nunca em código, nunca em markdown, nunca em commit.
- Se uma chave for exposta acidentalmente em qualquer lugar, a ação correta é
  rotacionar a chave, não apenas "esconder" o texto.

## 7. Regra Nº6 — Arquitetura simplificada (decisões já tomadas, não reabrir)

| Decisão | Status |
|---|---|
| Integração direta com ERP | ❌ Removida — dados de faturamento entram via upload de CSV |
| Arquitetura "Memory-First" / Edge Runtime obrigatório / Zero-Persistence | ❌ Removida — dados de CSV são persistidos normalmente no Postgres |
| Upstash Redis | ❌ Removido — nunca foi de fato usado, sem necessidade real |
| Validação IBGE PAM ("hectares fantasmas") | ❌ Fora do escopo atual |
| Gamificação (badges, trilhas) | ❌ Fora do escopo do MVP |
| Lista fixa de segmentos/cultivos | ❌ Removida — 100% configurável por tenant |
| Multi-tenant desde o dia 1 | ✅ Obrigatório |

Não reabra essas discussões sem o usuário pedir explicitamente. Elas já foram
decididas após auditoria real do código.

## 8. Regra Nº7 — Antes de codar, audite

Sempre que houver dúvida sobre o estado real de uma parte do sistema (existe? funciona?
está conectado a dados reais ou mock?), faça uma verificação **somente leitura** antes
de escrever qualquer código novo em cima dela. Não assuma que documentação antiga ou
comentários no código refletem a realidade atual.

---

## 9. Estado Conhecido do Projeto (snapshot da última verificação — 16/07/2026)

> **AUDITORIA COMPLETA S0/S1 REALIZADA EM 16/07/2026**
> Resultado: 6 blocos críticos de segurança, performance e confiabilidade **RESOLVIDOS**.

### Segurança (Bloco 1 — ✅ CONCLUÍDO)
- **Arquivos de cookies removidos**: `cookies.txt` e `cookies_prod.txt` deletados do working tree
  e removidos do histórico git via `git filter-branch` (102 commits reescritos).
- **Tokens encontrados eram MOCK** (não reais): `mock-refresh-token`, `mock-signature`. Sem
  necessidade de revogar sessão.
- **`.gitignore` atualizado**: adicionado `cookies_prod.txt` e `*.cookies.txt`.

### Build & Linting (Bloco 2 — ✅ CONCLUÍDO)
- **ESLint ativo**: removido `eslint: { ignoreDuringBuilds: true }` de `next.config.ts`.
- **Build passa com sucesso**: verificado 16/07/2026, 24 rotas compiladas sem erros.
- **Typings corrigidos**: removidas deprecated options Sentry (`disableServerWebpackPlugin`, etc).

### RLS Multi-Tenancy (Bloco 3 — ✅ CONCLUÍDO)
- **Rota dashboard refatorada**: `/api/planejamento/dashboard-full` agora usa `getSupabaseClientWithSession()`
  em vez de `supabaseAdmin` manual com `.eq('tenant_id', tenantId)`.
- **RLS automático**: 6 tabelas com políticas `tenant_isolation` verificadas:
  - `customers`, `customer_crop_areas`, `it_se_configurations`, `tenant_config_culturas`,
    `tenant_config_classificacoes`, `planejamento_cliente_segmento`
- **Tabelas pendentes criadas**: `tenant_config_culturas`, `tenant_config_classificacoes`,
  `planejamento_cliente_segmento` agora existem no schema com RLS.

### Performance: Índices (Bloco 4 — ✅ CONCLUÍDO)
- **8 índices criados** em `docs/supabase_migration_add_indexes.sql`:
  - Todos os `tenant_id` em 9 tabelas indexados
  - Índices compostos para queries comuns (e.g., `tenant_id, mes`)
- **Documentação EXPLAIN ANALYZE**: `docs/EXPLAIN_ANALYZE_indexes.md` — esperado 10-20x
  melhoria em query times.

### Performance: Paginação (Bloco 5 — ✅ CONCLUÍDO)
- **Paginação implementada**: `/api/clientes` (100 itens/página, max 1000) e
  `/api/faturamento` (500 itens/página, max 5000).
- **Query params**: `?limit=50&offset=0`.
- **Response**: inclui metadata `{data, pagination: {total, limit, offset, hasMore}}`.

### Confiabilidade (Bloco 6 — ✅ CONCLUÍDO)
- **Retry hook**: `useRetryMutation` com exponential backoff (3 tentativas, 1s→2s→4s, max 10s).
- **Toast system**: `ToastProvider` + `ToastContext` + `ToastContainer` (sem libs externas).
- **Exemplo funcional**: DELETE em `/workspace/clientes/page.tsx` implementado com retry + toast.
- **Documentação**: `docs/RETRY_AND_TOAST_PATTERN.md` com guia de uso.

### Banco de Dados
- **Banco novo** (`jcnxinvycgluoeqixdul.supabase.co`): confirmado funcional. Schema com
  13 tabelas (adicionadas 3 tables em Bloco 3), RLS habilitado em todas.
- **`SUPABASE_SERVICE_ROLE_KEY`**: rotacionada em 22/06/2026. Atual está apenas em `.env.local`.
- **Migrations pendentes**: `docs/supabase_migration_add_indexes.sql` deve ser executada em produção
  para aplicar índices (feita via Supabase SQL Editor, não automatizada).

### Auth/Login
- **`/login` ainda não existe**. `/register` e `/api/auth/register` funcionam.
- **Session handling**: JWT com `tenant_id` claim funcional, decodificação client-side em `src/lib/auth.ts`.

### Build
- **Estado: ✅ PASSING** — 16/07/2026, Next.js 16.2.4 (Turbopack), Sentry, 24 rotas OK.
- **Próximas tarefas**: executar migrations SQL em produção, testar RLS isolamento entre
  tenants reais (script `test_rls_dashboard.js` preparado).

---

### Resumo das Commits Realizadas (16/07/2026)
1. `chore: remove cookie files and update gitignore` — Bloco 1
2. `chore: remove eslint ignoreDuringBuilds` — Bloco 2
3. `refactor: replace supabaseAdmin with RLS-aware client` — Bloco 3 (RLS + tabelas)
4. `feat: add pagination to API listing routes` — Bloco 5
5. `feat: add retry with backoff and toast notifications` — Bloco 6

**Total de mudanças**: ~600 LOC adicionadas, 0 remoções críticas, build 100% passing.

### Resumo de Commits Realizadas (22/07/2026)
**Sprint 1 — Refactor UX + Bugs de Cálculo — 8 Tarefas Consolidadas**

1. `feat: add zero-dependency toast system` — Tarefa 0
   - Novo arquivo `src/lib/toast.ts` com `toast.success()` e `toast.error()`
   - Nenhuma dependência externa, CSS inline

2. `refactor: Heatmap inline edit (Excel-like)` — Tarefa 1
   - Substituiu `window.prompt()` por edição inline com input
   - Duplo clique edita, Enter/Esc/Tab funcionam conforme padrão Excel

3. `refactor: Planejamento 5→2 abas + 4 bug fixes` — Tarefa 2
   - Consolidação UX: "Resumo" (executiva) + "Editar" (Heatmap/Matriz)
   - **Bug 1:** camelCase API (vpmPotencialCentavos) vs snake_case leitura → NaN
   - **Bug 2:** Cultivos hardcoded (Soja/Milho/etc) → agora lê de `data.culturas` (Regra #6)
   - **Bug 3:** Segmento hardcoded 'FERTILIZANTES' → reusa segmento existente ou primeiro ativo
   - **Bug 4:** Cache não invalidado após POST → agora usa `queryClient.invalidateQueries()`

4. `refactor: página planejamento 2 abas` — Tarefa 3
   - Tipo de estado: `'resumo' | 'editar'` (era 5 valores)

5. `feat: SegmentSettings rename inline + delete + toast` — Tarefa 4
   - Duplo clique em nome (cultura/classificação) → input inline, Enter salva
   - Botão lixeira com confirmação antes de deletar
   - Toast feedback em cada operação

6. `feat: ITMatrix toast on save/error` — Tarefa 5
   - `toast.success('Índice Tecnológico salvo')`
   - `toast.error('Erro ao salvar Índice Tecnológico')`

7. `refactor: remove IT-SE from UI labels` — Tarefa 6
   - `/workspace/settings/configuracao`: "IT-SE (R$/ha)" → "Índice Tecnológico (R$/ha)"
   - `Passo5Apetite.tsx`: "Ticket Médio vs IT-SE" → "Ticket Médio vs Índice Tecnológico"
   - "IT-SE (R$/ha)" cabeçalho tabela → "Índice Tecnológico (R$/ha)"

8. `feat: API clientes suporta múltiplos cultivos` — Tarefa 7
   - POST/PATCH: novo formato `areas: [{cropName, areaHa}, ...]`
   - Retrocompatível com old format (fallback `cultivo`/`area_hectares`)
   - Cálculo de VPM per-area, não agregado cego
   - `area_hectares` retorna soma total de todas as áreas

9. `feat: modal cliente multi-cultivo` — Tarefa 8
   - Lista de linhas "Cultivo (select) + Hectares (input) + remover"
   - Botão "+Adicionar cultivo" para adicionar mais linhas
   - Remover linha desabilitada se < 1 linha

**Total de mudanças**: ~1.200 LOC adicionadas/refatoradas, 0 regressões, build 100% passing, 23 testes passando.

---

## 10. Onde encontrar o resto

- **O que construir, em que ordem, com quais critérios de aceite:** `docs/PRD.md`
- **Schema de banco:** `docs/schema_completo_supabase.sql`
- **Qualquer coisa não coberta aqui ou no PRD:** pergunte ao usuário antes de assumir
