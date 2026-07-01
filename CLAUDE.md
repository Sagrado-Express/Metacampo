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

## 9. Estado Conhecido do Projeto (snapshot da última verificação — 22/06/2026)

> Atualizar esta seção sempre que uma auditoria nova for feita. Não deixar
> desatualizada — informação velha aqui é tão perigosa quanto nos docs antigos.

- **Banco antigo** (`uoaktryjoztczbwklhzn.supabase.co`): morto, DNS não resolve. Não usar.
- **Banco novo** (`jcnxinvycgluoeqixdul.supabase.co`): confirmado funcional. Schema com
  10 tabelas aplicado, RLS habilitado em todas (verificado via `pg_tables`). `.env.local`
  atualizado para apontar exclusivamente para este banco.
- **Teste de isolamento RLS entre dois tenants: CONFIRMADO com sucesso em 22/06/2026**,
  via JWT real (claim `tenant_id` injetada na raiz pela trigger `custom_access_token_hook`,
  compatível com as políticas `tenant_isolation` já existentes). Usuários e tenants de
  teste (A e B) permanecem no banco para eventuais re-validações — não limpar sem aviso.
- **`SUPABASE_SERVICE_ROLE_KEY`**: foi exposta acidentalmente em chat em 22/06/2026 e
  rotacionada imediatamente. A chave atual está apenas em `.env.local`, nunca em texto.
- **Tabela `tenants`**: RLS habilitado sem política — acesso restrito a `service_role`
  via API Route, por decisão deliberada (não é bug).
- **Tabelas pendentes** (`tenant_config_classificacoes`, `tenant_config_culturas`):
  ainda não criadas — necessárias para a story E3-S3 do Épico 3, não bloqueiam nada hoje.
- **`it_se_configurations`**: nome de tabela em desacordo com a Regra Nº3 (deveria
  refletir "Índice Tecnológico"). Pendente, trabalho do Épico 3 — não corrigir fora de hora.
- **`VpmService`:** verificado funcional e testado — não revisar sem necessidade.
- **Build:** corrigido em 22/06/2026 (erro de import `SEGMENTOS`/`SEGMENTOS_LEGACY` em
  `itAAEngine.ts` resolvido; tipagem do Supabase client corrigida com `SupabaseClient`
  explícito, sem uso de `any`). Build de produção passou com sucesso (output verificado).
- **Auth/Login:** `/login` ainda **não existe**. Existe `/register` e `/api/auth/register`.
  Criar `/login` real com Supabase Auth + vínculo de `tenant_id` é o próximo bloco.

---

## 10. Onde encontrar o resto

- **O que construir, em que ordem, com quais critérios de aceite:** `docs/PRD.md`
- **Schema de banco:** `docs/schema_completo_supabase.sql`
- **Qualquer coisa não coberta aqui ou no PRD:** pergunte ao usuário antes de assumir
