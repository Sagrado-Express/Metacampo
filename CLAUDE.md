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
| Catálogo IBGE de culturas (28/07/2026) | ✅ Adicionado — é catálogo, **não** lista fixa |
| Multi-tenant desde o dia 1 | ✅ Obrigatório |

Não reabra essas discussões sem o usuário pedir explicitamente. Elas já foram
decididas após auditoria real do código.

> **Catálogo ≠ lista fixa.** A linha do catálogo IBGE acima não contradiz a
> linha da lista fixa; a distinção é deliberada e foi pedida pelo usuário em
> 28/07/2026:
>
> - **Lista fixa** (proibida): o tenant só poderia usar o que está na lista.
> - **Catálogo** (`src/data/culturas_ibge.ts`): 31 culturas temporárias e 33
>   permanentes que o tenant **habilita** se quiser, poupando digitação. Criar
>   cultura fora do catálogo continua livre.
>
> É o que permite os dois casos reais do agronegócio: **HF** (agrupamento
> próprio de frutas e vegetais, sem correspondência no IBGE) e **Milho safra /
> Milho safrinha** (duas culturas comerciais apontando para o mesmo
> `Milho (em grão)`). Por isso `tenant_config_culturas.ibge_produto` é
> nullable e **não** é único.
>
> O catálogo vive em código, não em tabela: é dado de referência idêntico em
> todos os tenants, e virar tabela significaria 64 linhas por tenant com RLS
> para o mesmo conteúdo.

## 8. Regra Nº7 — Antes de codar, audite

Sempre que houver dúvida sobre o estado real de uma parte do sistema (existe? funciona?
está conectado a dados reais ou mock?), faça uma verificação **somente leitura** antes
de escrever qualquer código novo em cima dela. Não assuma que documentação antiga ou
comentários no código refletem a realidade atual.

---

## 9. Estado Conhecido do Projeto (snapshot da última verificação — 04/08/2026)

> ### Auditoria de funcionalidades e consolidação de documentação (04/08/2026)
>
> Levantamento completo de código real (grep + teste, não leitura de nome de
> arquivo) contra o PRD. Resultado detalhado agora vive em
> `docs/PRD.md` Seção 16 — inclui o mapeamento dos 16 passos do GTMGC ×
> status real, que o `CLAUDE.md` já afirmava existir aqui mas não existia.
>
> **Limpeza de código órfão:** 29 arquivos removidos — as árvores inteiras
> `src/components/ctv/`, `dashboards/`, `governance/`, `manager/` (resquício
> das rotas `/ctv`, `/governance`, `/manager`, `/admin` já removidas antes),
> 9 `domain/services` sem nenhum consumidor, `mock_database.ts`,
> `monthly_master.ts`, e o motor de VPM que não roda em produção
> (`domain/services/vpm.service.ts` — o que roda é `lib/services/VpmService.ts`).
>
> **Testes:** a suíte anterior em `domain/services/__tests__` tinha 100% de
> sucesso mas reimplementava a lógica em array local em vez de importar
> código real — nenhum bug real desta auditoria teria sido pego por ela.
> Removida e substituída por `src/lib/services/__tests__/VpmService.test.ts`
> (importa o módulo real) e `npm run test:rls` (formaliza
> `test_rls_dashboard.js`, já existente, como o teste de isolamento).
>
> **Dois bugs de segurança reais, achados testando o convite de usuário
> ponta a ponta:**
> 1. Usuário registrado por convite nunca recebia `tenant_id` em
>    `app_metadata` (`register/route.ts` usava `signUp()`, que só grava
>    `user_metadata`) — com o fail-closed já em produção, essa conta nunca
>    mais conseguia logar. Corrigido com `supabaseAdmin.auth.admin.createUser()`.
> 2. **Vazamento de sessão entre requisições**: `login/route.ts` chamava
>    `signInWithPassword()` no client singleton compartilhado
>    (`@/lib/supabase`, vivo pelo processo inteiro), e `getSession()` tinha
>    um fallback que lia esse mesmo singleton quando não havia cookie. Um
>    processo aquecido por um login recente podia devolver a sessão de
>    OUTRO usuário para uma requisição sem sessão nenhuma. Corrigido:
>    login usa `createAnonClient()` (client novo por chamada), e o fallback
>    perigoso em `getSession()` foi removido — sem cookie agora é
>    fail-closed, sem tentar mais nada.
>
> **Banco:** 5 tabelas dropadas por estarem vazias e sem nenhuma rota —
> `customer_faixas`, `scoring_weights`, `official_safra_plans`,
> `setup_budgets`, `customer_forecasts`. Cada uma sustentava um passo do
> GTMGC nunca construído (ver PRD Seção 16). `docs/schema_completo_supabase.sql`
> foi reescrito como espelho fiel do banco live (extraído via PostgREST),
> não mais uma base histórica com notas de "o que mudou depois".
>
> **Documentação:** `docs/` tinha 8 arquivos, hoje tem 2 —
> `PRD.md` e `schema_completo_supabase.sql`. Removidos: `backlog.md` e
> `status_agile.md` (datados de 25/05, alegavam "Concluído" para
> Memory-First/Multi-Tenancy antes de qualquer auditoria real — o próprio
> PRD de 21/06 já descrevia essas alegações como falsas) e 5 SQLs soltos
> (`create_planejamento_tables.sql`, `create_tenant_invites.sql`,
> `migration_metadata_dictionary.sql`, `supabase_migration_v4.sql`,
> `supabase_security_triggers.sql`) — superados pelas migrations reais em
> `supabase/migrations/`, e em pontos ativamente errados (um descrevia
> `aliases` como JSONB quando a produção usa `TEXT[]`; outro criava tabelas
> já dropadas; o de segurança descrevia um `custom_access_token_hook` que
> nunca foi ativado).
>
> **Convite de usuário:** de API sem UI para fluxo completo — aba Usuários
> em Configurações, `GET /api/tenant/invites` (não existia), testado
> ponta a ponta com conta real logando e vendo só os dados do tenant certo.
>
> A partir de agora, `supabase/migrations/*.sql` é a fonte de verdade de
> histórico de schema (aplicado via `supabase db push`); `docs/schema_completo_supabase.sql`
> é o espelho consolidado; `docs/PRD.md` Seção 16 é o status vivo por
> passo/épico. Nenhum outro arquivo de schema ou de status deve ser criado
> — editar estes três.

> ### Correção de registros anteriores (28/07/2026)
>
> A revisão de 28/07 encontrou afirmações **incorretas** neste próprio arquivo e
> em documentos que foram removidos. Registrado aqui para não se repetir:
>
> - **"Banco antigo `uoaktryjoztczbwklhzn` morto, DNS não resolve"** — falso.
>   O banco responde normalmente e é o banco em uso. O banco
>   `jcnxinvycgluoeqixdul` é que não pertence a esta conta.
> - **"Bloco 3 (RLS) CONCLUÍDO"** — não estava. A prova apresentada foi apenas
>   `npm run build`. O refactor passava a `getSupabaseClientWithSession()` um JWT
>   com assinatura literal `'mock-signature'`, que o Supabase rejeita: a rota
>   ficou sem acesso a dado nenhum. Um build passando não prova RLS.
> - **`docs/EXPLAIN_ANALYZE_indexes.md`** — continha "medições" de ganho de
>   10-20x que nunca foram executadas. Arquivo removido.
> - **13 arquivos de doc/script criados** violando a Regra Nº2. Removidos.
>
> Lição operacional: prova de RLS é query com dois JWTs reais e resultados
> divergentes. Build verde não é prova de comportamento.

### Banco em uso
- **`uoaktryjoztczbwklhzn.supabase.co`** — ativo, é o banco de produção.
  Vinculado via `supabase link`; `supabase db push` funciona sem senha extra.
- Conexão direta (`db.<ref>.supabase.co`) resolve **só em IPv6** — por isso
  clientes Postgres locais falham com ENOTFOUND. Use o CLI ou o SQL Editor.

### Multi-tenancy / RLS — VERIFICADO com dois tenants reais
- `tenant_id` vem de `app_metadata` no JWT, que o Supabase injeta sozinho.
  **Não** há `custom_access_token_hook` nem toggle de dashboard envolvido.
- Helper `public.current_tenant_id()` lê a claim; policies usam
  `USING` **e** `WITH CHECK` (as anteriores só tinham `USING`, deixando
  INSERT sem restrição).
- Prova reproduzível: `node test_rls_dashboard.js` — faz login real dos dois
  usuários, consulta sem filtro manual, e inclui teste negativo com token
  adulterado (deve dar 401).
- Todas as rotas de API usam `getAuthedContext()`. O `tenantId` vem da claim
  assinada, **nunca** de query param.

### Usuários de teste
| Email | Senha | Tenant |
|---|---|---|
| `teste1@metacampo.com` | `Teste123!@#` | `11111111-...-1111` (CTV Teste A) |
| `teste2@metacampo.com` | `Teste123!@#` | `22222222-...-2222` (CTV Teste B) |

São fixtures de teste. Não promover para produção real sem trocar as senhas.

### Segredos — situação verificada em 28/07/2026
- **Repositório `Sagrado-Express/Metacampo` é PÚBLICO.** Qualquer `.env` ou
  chave que entre em commit vira público na hora.
- `.env.local` **nunca** foi commitado (verificado em todo o histórico).
- A `SUPABASE_SERVICE_ROLE_KEY` do banco em uso (`uoaktryjoztczbwklhzn`) está
  apenas em `.env.local` (gitignored) e nas env vars da Vercel. **Não** está
  no repositório.
- Ela foi exposta em chat em 28/07. **Decisão do usuário: não rotacionar**,
  por a exposição estar limitada ao transcript e não ao repositório público.
  Decisão consciente registrada — não reabrir sem o usuário pedir.
- **Pendente:** `scripts/create_production_users.js`,
  `scripts/seed_pedagogical_data.{js,ts}` e `scripts/seed_pedagogical_data_s1.js`
  têm uma `service_role` key **hardcoded e versionada no repo público**.
  A chave é do projeto `jcnxinvycgluoeqixdul`, que não existe mais (host não
  resolve), então hoje é inócua. O risco é o padrão: esses scripts devem ler
  a chave de `process.env`, nunca de literal no código.
- **Ganho dos índices não medido.** Os índices existem, mas com ~4 linhas por
  tabela o Postgres faz seq scan de qualquer forma. A afirmação de ganho de
  performance permanece **não provada** até haver volume realista.
- `/register` e `/api/tenant/invites` ainda usam `supabaseAdmin` (service_role).
  É legítimo para essas rotas, mas não foram exercitadas nesta rodada.

---

> **AUDITORIA S0/S1 (16/07/2026) — leia junto com a correção acima**

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
- **Status real de implementação — por épico e pelos 16 passos do GTMGC:** `docs/PRD.md` Seção 16 (viva, atualizar a cada auditoria — não criar arquivo separado pra isso)
- **Schema de banco (espelho fiel da produção):** `docs/schema_completo_supabase.sql`
- **Histórico de migrations aplicadas:** `supabase/migrations/*.sql` — é a fonte de verdade de *como* o schema chegou ao estado atual; `schema_completo_supabase.sql` é o resultado consolidado
- **Descrição completa da metodologia GTMGC (prosa, não resumo):** `Arquivos teste/GTMGC_Metodologia_Completo_v2 - 20260424 (1).docx`
- **`docs/` só tem esses dois arquivos** (`PRD.md` e `schema_completo_supabase.sql`) — de propósito. Não adicionar um terceiro sem antes perguntar ao usuário (Regra Nº2).
- **Qualquer coisa não coberta aqui ou no PRD:** pergunte ao usuário antes de assumir
