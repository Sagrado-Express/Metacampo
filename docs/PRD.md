# PRD — MetaCampo (GTMGC SaaS)
**Versão:** 2.0 — Fonte Única da Verdade (substitui todos os documentos anteriores)
**Data:** 2026-06-21
**Status:** Aprovado para execução — Sprint 0
**PM:** [usuário/dono do produto]

> Este documento é a ÚNICA fonte de verdade do projeto. Os documentos anteriores
> (PRD.md antigo, ARCHITECTURE.md, GEMINI.md, MASTER_ALIGNMENT.md, EXECUTIVE_SUMMARY.md,
> INFRASTRUCTURE.md, ROADMAP.md, SECURITY.md, STATUS_REPORT.md, WALKTHROUGH.md,
> Especificacao_Tecnica_Blueprint_V4.md) estão **deprecados e devem ser removidos**.
> Qualquer informação neles que conflite com este PRD está incorreta.

---

## 0. Por que este documento existe

Uma auditoria de realidade (somente leitura, código + infra) em 2026-06-21 encontrou:
- O motor de cálculo de negócio (`VpmService`) **existe, está correto e testado**.
- Tudo o resto que conecta esse motor a um produto real (banco de dados, login,
  persistência, isolamento por empresa) **não está funcionando** — são telas com
  dados mockados, banco pausado, sem tela de login, sem persistência real.
- Os documentos antigos diziam que o projeto estava "70% concluído". Isso é falso.
  O que está concluído é a lógica de cálculo. O produto utilizável está perto de 0%.

Este PRD parte da realidade confirmada, não da intenção documentada.

---

## 1. VISÃO GERAL

### 1.1 Problema
Empresas do agronegócio (distribuidoras, cooperativas) gerenciam carteiras de CTVs
(vendedores técnicos) de forma intuitiva e imprecisa. A metodologia GTMGC (16 passos)
resolve isso transformando hectares e cultivos em potencial financeiro mensurável (VPM),
permitindo metas realistas, priorização de clientes e planos de visita orientados por dados.

### 1.2 Solução Proposta
Web app multi-tenant (SaaS), onde cada empresa cliente cadastra sua própria carteira,
configura seus próprios segmentos e cultivos, planeja metas e acompanha execução.
Sem integração com ERP — dados de faturamento entram via upload de CSV periódico.

### 1.3 Usuários Primários
**Persona 1 — Admin da Empresa**
- Configura o Índice Tecnológico (R$/ha por cultivo × segmento), cadastra segmentos
  e cultivos próprios da empresa, gerencia usuários.
- Nível técnico: leigo/intermediário.

**Persona 2 — Gestor Regional**
- Acompanha múltiplos CTVs da sua região, audita carteiras, valida metas, monitora execução.
- Nível técnico: leigo.

**Persona 3 — CTV (Consultor Técnico de Vendas)**
- Cadastra e gerencia sua própria carteira de clientes, planeja metas por segmento/cultivo,
  registra grau de confiança, executa plano de visitas.
- Nível técnico: leigo, usa principalmente celular em campo.

### 1.4 Objetivo de Negócio Mensurável
- **KR 1:** Sistema usável end-to-end (login → cadastro de carteira → meta → dashboard)
  funcionando com dados reais (não mock) em [CONFIRMAR COM USUÁRIO: prazo em semanas].
- **KR 2:** Validação com 1-2 clientes piloto (consultoria própria) antes de abrir
  para venda self-service.

---

## 2. STACK TÉCNICA

### 2.1 Tecnologias
| Camada | Tecnologia | Observação |
|---|---|---|
| Frontend | Next.js (App Router) | Já existe no projeto — reaproveitar |
| Backend | Next.js API Routes | Sem Edge Runtime obrigatório — simplificado |
| Banco de dados | Supabase (Postgres) | `uoaktryjoztczbwklhzn.supabase.co` — em uso, é o banco de produção. Um projeto separado (`jcnxinvycgluoeqixdul`) foi tratado como "o novo" por um tempo em 07/2026; não pertence a esta conta e nunca teve dados reais. |
| Autenticação | Supabase Auth | A construir — hoje não existe nem a tela de `/login` |
| Cache/Fila | Nenhum | Upstash Redis removido — nunca foi de fato usado |
| Deploy | Vercel (Pro, já confirmado) | Mantido |
| CI/CD | GitHub | Mantido |

### 2.2 O que foi removido da arquitetura antiga (e por quê)
| Item removido | Motivo |
|---|---|
| Arquitetura "Memory-First" / Zero-Persistence em Edge Functions | Nunca foi totalmente implementada (dados de CSV eram descartados, não salvos). Sem integração com ERP, não há razão para essa complexidade. CSV agora **persiste normalmente** no Postgres. |
| Upstash Redis | Pacote nunca instalado, serviço nunca inicializado. Puro custo de complexidade sem uso real. |
| Validação IBGE PAM ("hectares fantasmas") | Fora do escopo atual — pode voltar em fase futura se houver demanda real. |
| Integração com ERP de terceiros | Substituída por upload de CSV periódico, configurável pelo usuário. |
| Nomenclatura ITAA / IT-SE | Renomeado para **"Índice Tecnológico"** em todo o código, UI e banco de dados — ver Glossário (Seção 15). |
| Lista fixa de segmentos (Sementes, Fertilizantes, etc.) | Segmentos e cultivos agora são **100% configuráveis por tenant** — já existe um início disso em `/workspace/settings/segments`, precisa ser finalizado e ligado ao banco real. |
| `seed.ts` em PascalCase/Português | Schema mismatch com o SQL real. Removido. |
| Gamificação (badges, trilhas) | Fora do escopo do MVP. Exigirá spike técnico próprio se entrar no roadmap futuro. |

---

## 3. ARQUITETURA & ESTRUTURA DE ARQUIVOS

### 3.1 Diagrama de Componentes
```
[Browser - CTV/Gestor/Admin]
        ↓ HTTPS
[Vercel - Next.js App Router]
        ↓
[Next.js API Routes]
        ↓
[Supabase: Postgres + Auth + RLS]
```

### 3.2 O que manter da estrutura atual
```
src/
├── domain/services/
│   ├── vpm.service.ts          # MANTER — testado, correto
│   ├── itAAEngine.ts           # RENOMEAR + FINALIZAR migração de segmentos
│   ├── scoringEngine.ts        # MANTER, adicionar testes
│   ├── planningService.ts      # MANTER, religar a dados reais
│   ├── middleware.service.ts   # MANTER lógica de parsing, ADICIONAR persistência real
│   ├── governanceService.ts    # MANTER, religar a dados reais (hoje é só log em memória)
│   ├── visitService.ts         # MANTER
│   ├── audit.service.ts        # MANTER, religar a tabela real de auditoria
│   ├── forecastEngine.ts       # MANTER
│   └── intelligence.service.ts # MANTER
├── app/
│   ├── login/                  # NÃO EXISTE — CRIAR
│   ├── register/                # EXISTE, religar ao Supabase Auth novo
│   ├── workspace/               # EXISTE, religar a dados reais
│   ├── ctv/                     # EXISTE mas quebrado (bug SEGMENTOS) — CORRIGIR
│   ├── governance/              # EXISTE mas quebrado — CORRIGIR + religar
│   ├── manager/                 # EXISTE mas quebrado — CORRIGIR + religar
│   └── admin/                   # EXISTE mas quebrado — CORRIGIR + religar
└── data/
    ├── mock_database.ts         # REMOVER após religar tudo a dados reais
    └── monthly_master.ts        # REMOVER após religar tudo a dados reais
```

---

## 4. FUNCIONALIDADES — ÉPICOS & STORIES (Sprint 0 — Fundação Real)

> Sprint 0 não entrega feature nova. Entrega um produto que funciona de ponta a ponta
> com dados reais. Sem isso, nenhuma feature nova tem valor demonstrável.

### ÉPICO 0: Limpeza de Documentação
**Objetivo:** eliminar ambiguidade — só este PRD é fonte de verdade.

#### E0-S1: Remover documentos deprecados
**Como** dono do produto, **quero** que o repositório tenha apenas um documento de
referência, **para que** o agente de IA não siga regras conflitantes.

**Critérios de Aceite:**
- [ ] Os arquivos `ARCHITECTURE.md`, `GEMINI.md`, `MASTER_ALIGNMENT.md`,
  `EXECUTIVE_SUMMARY.md`, `INFRASTRUCTURE.md`, `ROADMAP.md`, `SECURITY.md`,
  `STATUS_REPORT.md`, `WALKTHROUGH.md`, `Especificacao_Tecnica_Blueprint_V4.md`
  e o `PRD.md` antigo são deletados do repositório (ou movidos para `docs/_deprecated/`
  se o usuário preferir manter histórico fora do caminho ativo).
- [ ] O `README.md` é reescrito para apontar apenas para este `PRD.md`.
- [ ] Nenhuma referência a ITAA, "Memory-First", "Wallet Share" ou Upstash Redis
  permanece em código ou comentários ativos.

**Story Points:** 1
**Prioridade:** Must Have

---

### ÉPICO 1: Infraestrutura Real
**Objetivo:** ter um banco de dados vivo, com schema correto e multi-tenant desde o início.

#### E1-S1: Provisionar novo projeto Supabase e aplicar schema
**Como** desenvolvedor, **quero** um banco de dados Postgres real e funcional,
**para que** o sistema deixe de depender de dados mockados.

**Fluxo principal:**
1. Usuário cria novo projeto no Supabase
2. Sistema aplica `schema_completo_supabase.sql` (já existente em `docs/`) como migration inicial
3. Sistema confirma RLS habilitado em 100% das tabelas de negócio
4. Variáveis de ambiente (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)
   são atualizadas na Vercel (produção e preview)

**Critérios de Aceite:**
- [ ] Dado o schema aplicado, quando consultado via `\dt`, então todas as tabelas
  listadas na Seção 8 existem
- [ ] Dado RLS habilitado, quando um usuário sem JWT tenta consultar `customers`,
  então a consulta retorna vazio (não erro, não dados de outro tenant)
- [ ] `tenants` existe e toda tabela de negócio tem coluna `tenant_id NOT NULL`

**Story Points:** 3
**Prioridade:** Must Have

---

### ÉPICO 2: Autenticação Multi-Tenant Real
**Objetivo:** existir login de verdade, com isolamento de dados por empresa.

#### E2-S1: Tela de login funcional
**Como** usuário (Admin/Gestor/CTV), **quero** fazer login com email e senha,
**para que** eu acesse apenas os dados da minha empresa.

**Fluxo principal:**
1. Usuário acessa `/login`
2. Usuário informa email e senha
3. Sistema autentica via Supabase Auth
4. Sistema injeta `tenant_id` e `role` como custom claims no JWT
5. Sistema redireciona para o workspace correspondente ao `role`

**Edge cases:**
- Se credenciais inválidas: sistema exibe "Email ou senha incorretos" (sem revelar qual)
- Se usuário sem `tenant_id` associado: sistema bloqueia acesso e exibe
  "Conta não associada a uma empresa. Contate o administrador."

**Critérios de Aceite:**
- [ ] Dado um usuário válido, quando faz login, então é redirecionado ao workspace do seu papel
- [ ] Dado dois usuários de empresas diferentes, quando ambos logam, então cada um
  vê apenas os dados da própria empresa (testar manualmente criando 2 tenants)
- [ ] `/login` não retorna 404

**Story Points:** 5
**Prioridade:** Must Have

#### E2-S2: Cadastro de Admin da Empresa (onboarding mínimo)
**Como** novo cliente do SaaS, **quero** me cadastrar e criar minha empresa,
**para que** eu possa começar a usar o sistema sem depender de suporte manual.

**Critérios de Aceite:**
- [ ] Dado um cadastro novo, quando submetido, então um registro em `tenants` é criado
- [ ] O primeiro usuário do tenant recebe automaticamente o papel "Admin"
- [ ] Convite de novos usuários (Gestor/CTV) para o mesmo tenant é possível via email

**Story Points:** 5
**Prioridade:** Should Have (pode ser manual/via suporte no piloto, automatizar depois)

---

### ÉPICO 3: Índice Tecnológico & Segmentos Configuráveis
**Objetivo:** finalizar o que já estava pela metade — segmentos e cultivos 100%
configuráveis por empresa, sem lista fixa hardcoded.

#### E3-S1: Corrigir build quebrado (SEGMENTOS vs SEGMENTOS_LEGACY)
**Como** desenvolvedor, **quero** que o projeto compile sem erros,
**para que** as telas `/ctv`, `/governance`, `/manager` e `/admin` voltem a funcionar.

**Critérios de Aceite:**
- [ ] `itAAEngine.ts` expõe um único export consistente (sem `_LEGACY`)
- [ ] Todas as 4 rotas afetadas compilam e renderizam sem erro

**Story Points:** 2
**Prioridade:** Must Have (bloqueador)

#### E3-S2: Renomear ITAA → Índice Tecnológico em todo o sistema
**Como** usuário, **quero** ver "Índice Tecnológico" na interface (não ITAA/IT-SE),
**para que** a nomenclatura seja a que minha empresa entende.

**Critérios de Aceite:**
- [ ] Nenhuma tela exibe "ITAA" ou "IT-SE" para o usuário final
- [ ] Tabela `it_se_configurations` é renomeada para `indice_tecnologico_config`
  (ou mantém nome técnico, mas toda exibição usa o termo correto — decisão de
  engenharia, desde que a UI esteja 100% correta)

**Story Points:** 3
**Prioridade:** Must Have

#### E3-S3: Segmentos e cultivos configuráveis ligados ao banco real
**Como** Admin da empresa, **quero** cadastrar meus próprios segmentos e cultivos,
**para que** o sistema reflita como minha empresa realmente organiza o portfólio.

**Fluxo principal:**
1. Admin acessa `/workspace/settings/segments`
2. Admin cadastra/edita/remove segmentos (nome livre)
3. Admin cadastra/edita/remove cultivos (nome livre)
4. Admin define o valor R$/ha (Índice Tecnológico) por combinação cultivo × segmento
5. Sistema salva no Supabase (não mais em `local_dictionary.json`)

**Critérios de Aceite:**
- [ ] Dado um novo segmento cadastrado, quando salvo, então persiste em
  `tenant_config_classificacoes` (tabela já existe, falta ligar)
- [ ] Dado dois tenants diferentes, quando cada um cadastra segmentos próprios,
  então não há vazamento entre eles

**Story Points:** 5
**Prioridade:** Must Have

---

### ÉPICO 4: Persistência Real (eliminar mock)
**Objetivo:** toda tela consome dados reais do Supabase, nenhuma usa `mock_database.ts`.

#### E4-S1: Religar `/workspace` (Diagnóstico) a dados reais
**Critérios de Aceite:**
- [ ] Tela carrega clientes, metas e VPM de tabelas reais filtradas por `tenant_id`
- [ ] `mock_database.ts` e `monthly_master.ts` não são mais importados nesta rota

**Story Points:** 5
**Prioridade:** Must Have

#### E4-S2: Religar `/ctv`, `/manager`, `/admin`, `/governance` a dados reais
**Critérios de Aceite:**
- [ ] As 4 rotas funcionam com dados reais, sem `localStorage` como fonte de verdade
- [ ] `governanceService.ts` persiste o "Handshake" (congelamento de plano) em
  `official_safra_plans`, não apenas em log

**Story Points:** 8
**Prioridade:** Must Have

---

### ÉPICO 5: Ingestão de Faturamento com Persistência Real
**Objetivo:** upload de CSV salva dados de verdade (não processa e descarta).

#### E5-S1: Persistir resultado da ingestão de CSV
**Como** CTV ou Gestor, **quero** fazer upload de um CSV de faturamento periodicamente,
**para que** o sistema calcule Saldo TO-GO com dados reais.

**Fluxo principal:**
1. Usuário faz upload do CSV no formato esperado
2. Sistema parseia e reconcilia aliases de segmento (lógica já existe em `IngestionMapper`)
3. Sistema exibe modal de conciliação para segmentos não reconhecidos
4. Usuário confirma o mapeamento
5. Sistema **salva** o resultado consolidado em `faturamento_snapshots`

**Edge cases:**
- Se segmento do CSV não existe no cadastro do tenant: sistema bloqueia e pede
  conciliação manual antes de salvar
- Se CSV duplicado (mesmo mês já importado): sistema avisa e pergunta se deve substituir

**Critérios de Aceite:**
- [ ] Dado um CSV válido, quando importado, então os dados aparecem em
  `faturamento_snapshots` (não somem após o upload)
- [ ] Dado um segmento desconhecido, quando detectado, então a importação é
  bloqueada até conciliação manual

**Story Points:** 5
**Prioridade:** Must Have

---

## 5. REGRAS DE NEGÓCIO

| # | Regra | Detalhe |
|---|---|---|
| RN-01 | Toda tabela de negócio tem `tenant_id` | Sem exceção. Toda query inclui `.eq('tenant_id', tenantId)`. |
| RN-02 | Nenhuma integração direta com ERP | Dados de faturamento entram apenas via upload de CSV manual/periódico. |
| RN-03 | Segmentos e cultivos são livres por tenant | Não existe lista fixa no código. Tudo configurável na tela de Admin. |
| RN-04 | Nomenclatura oficial é "Índice Tecnológico" | Proibido usar ITAA, IT-SE, "Valor/ha" em qualquer texto visível ao usuário. |
| RN-05 | Cálculos financeiros em centavos (inteiros) | Conversão para R$ apenas na exibição — mantido da arquitetura original, é uma boa prática. |
| RN-06 | Plano comercial "congelado" é imutável | Após Handshake (Passo 10), o registro em `official_safra_plans` não pode ser editado, apenas substituído por novo snapshot. |

---

## 6. DESIGN & UX

### 6.1 Design System
- Manter o padrão visual já existente no projeto (glassmorphism leve, tons de verde/café) —
  não há necessidade de redesenhar, só de religar a dados reais.

### 6.3 Estados de UI que devem existir em toda tela
- [ ] Loading state
- [ ] Empty state (carteira vazia, sem segmentos cadastrados, etc.)
- [ ] Error state (falha de conexão com Supabase)
- [ ] Success state

---

## 7. BANCO DE DADOS — TABELAS (fonte de verdade: `docs/schema_completo_supabase.sql`)

`docs/schema_completo_supabase.sql` é um espelho fiel do banco em produção,
não uma base histórica — se este PRD e aquele arquivo divergirem, o schema
tem razão. Tabelas em produção hoje (04/08/2026):

`tenants`, `clientes` (nome de produção — a tabela chamava-se `customers`
neste PRD e no schema até 28/07/2026), `customer_crop_areas`,
`it_se_configurations`, `faturamento_snapshots`, `tenant_config_culturas`,
`tenant_config_classificacoes`, `planejamento_cliente_segmento`,
`tenant_invites`, `user_tenants`.

Todas com `tenant_id UUID NOT NULL REFERENCES tenants(id)` e RLS habilitado
com `USING` + `WITH CHECK` (verificado com dois tenants reais, não apenas
"RLS ligado no painel" — ver Regra Nº4 do CLAUDE.md).

**Removidas em 04/08/2026** (existiam, RLS habilitado, 0 linhas, 0 rota de
API, 0 tela — cada uma sustentava um passo do GTMGC nunca construído):
`customer_faixas` (Passo 13), `scoring_weights` (Passo 14),
`official_safra_plans` (Passo 10 / RN-06), `setup_budgets`,
`customer_forecasts`. Se algum desses passos entrar no roadmap, a tabela
precisa ser recriada do zero — ver Seção 16.

---

## 13. RISCOS PRINCIPAIS

| # | Risco | Score | Mitigação |
|---|---|---|---|
| R1 | Tentar adicionar features novas antes de terminar Sprint 0 | 🔴 20 | Bloquear qualquer story fora do Épico 0-5 até Definition of Done da Seção 14 ser atingida |
| R2 | Repetir o padrão de "documentar conclusão sem verificar" | 🔴 16 | Toda story só é marcada como concluída após teste manual real, não após o agente declarar sucesso |
| R3 | Confundir tenant novo com dados de teste do projeto antigo | 🟠 9 | Projeto Supabase novo, sem migração de dados do antigo |

---

## 14. DEFINITION OF DONE — SPRINT 0

> Atualizado 04/08/2026 com prova, não com afirmação. Cada item marcado
> tem um teste reproduzível associado — ver Seção 16.

- [x] Build compila sem erros — `npm run build`, 24 rotas, 0 erros
- [x] `/login` existe, funciona, e isola corretamente 2 tenants de teste
  diferentes — `npm run test:rls` prova via login real + teste negativo
  com token adulterado (401)
- [ ] ~~Todas as 5 telas (`/workspace`, `/ctv`, `/governance`, `/manager`,
  `/admin`) renderizam com dados reais~~ — critério obsoleto: `/ctv`,
  `/governance`, `/manager`, `/admin` nunca chegaram a ser religadas: eram
  telas mortas (usavam `mock_database.ts`, sem nenhuma rota apontando pra
  elas) e foram **removidas** em 04/08/2026, não corrigidas. `/workspace`
  foi substituída pela tela Início, que usa dado real do tenant — essa
  parte está feita.
- [ ] Upload de CSV persiste em `faturamento_snapshots` — **não feito**.
  `/api/faturamento` aceita POST direto, mas não existe parser de CSV nem
  tela de conciliação de segmento (ver Épico 5 e Passo 12 na Seção 16)
- [x] Segmentos/cultivos configuráveis funcionam ligados ao banco, testado
  com 2 tenants — vai além do escopo original: apelidos, promoção de
  apelido a nome, catálogo IBGE de 64 produtos
- [x] Nenhuma menção a ITAA/IT-SE visível ao usuário — verificado por
  grep em `src/app` e `src/components` (04/08/2026): os únicos hits
  restantes são o nome interno da tabela `it_se_configurations` e um id
  de aba não-visível, nenhum texto renderizado
- [x] Os 11 documentos antigos foram removidos do repositório
- [x] `docs/PRD.md` e `docs/schema_completo_supabase.sql` são os únicos
  dois arquivos em `docs/` — os 5 SQLs soltos que ainda existiam
  (`create_planejamento_tables.sql`, `create_tenant_invites.sql`,
  `migration_metadata_dictionary.sql`, `supabase_migration_v4.sql`,
  `supabase_security_triggers.sql`) foram removidos em 04/08/2026 por
  descreverem uma versão anterior — um deles descrevia um
  `custom_access_token_hook` que nunca foi ativado, outro criava tabelas
  já dropadas

---

## 15. GLOSSÁRIO

| Termo | Definição |
|---|---|
| **Índice Tecnológico** | Valor em R$/ha por cultivo × segmento, configurável por empresa (substitui ITAA/IT-SE) |
| **VPM** | Potencial financeiro total do cliente: Σ(hectares × Índice Tecnológico) |
| **Tenant** | Uma empresa cliente do SaaS. Toda tabela de negócio é isolada por `tenant_id` |
| **Saldo TO-GO** | Meta menos realizado, calculado a partir de `faturamento_snapshots` |
| **Handshake** | Congelamento/aprovação do plano comercial — gera registro imutável |

---

## 16. ESTADO DE IMPLEMENTAÇÃO (seção viva — atualizar a cada auditoria)

> Esta seção existe porque o `CLAUDE.md` afirma que "os 16 passos do GTMGC
> [estão] descritos em detalhe" aqui. Até 04/08/2026 isso era falso — o
> PRD citava "Passo 10" uma única vez, de passagem. A descrição completa
> da metodologia está em `Arquivos teste/GTMGC_Metodologia_Completo_v2 -
> 20260424 (1).docx`; a tabela abaixo é o resumo com status real,
> verificado por leitura de código e teste, não por inferência do nome
> dos arquivos.

### 16.1 Os 16 passos × o que existe hoje

| # | Passo | Status | Onde / o que falta |
|---|---|---|---|
| 1 | Viabilidade (meta ÷ share = VPM necessário, vs apetite do CTV) | ✅ Completo | `/workspace/viabilidade` — testado 04/08/2026 (ver 16.4) |
| 2 | Cadastro da carteira (cliente × cultivo × hectares) | ✅ Completo | `/workspace/clientes` — multi-área, VPM real, avisos de pendência |
| 3 | Potencial por cultivo (dashboard parte 1) | ✅ Completo | Planejamento → Resumo → "Por Cultivo" |
| 4 | Meta por segmento em cada cliente × cultivo | ✅ Completo | Apetite (heatmap por segmento), Planejamento → Editar |
| 5 | Calibrar apetite ao longo do ano + "portais no tempo" (janelas fenológicas) | 🟡 Metade | Calibrar o % existe. Monitorar ao longo do ano / alertar janela fechando — não existe; nenhuma tela viva tenta isso |
| 6 | Consolidado por cultivo (dashboard parte 2) | ✅ Completo | Mesmos cards do Passo 3 (potencial + planejado) |
| 7 | Previsão consolidada por segmento | ✅ Completo | Planejamento → Resumo → "Por Classificação de Produto" |
| 8 | Matriz segmento × cultivo | ✅ Completo | Planejamento → Editar → Matriz |
| 9 | Carteira consolidada, uma linha por cliente | 🟡 Metade | `/workspace/clientes` já é uma linha por cliente com VPM potencial, mas não mostra a estimativa planejada ao lado |
| 10 | Handshake — CTV confirma meta oficial (congela o plano) | ❌ Zero | RN-06. Tabela `official_safra_plans` nunca teve rota nem tela; **removida** em 04/08/2026 por estar vazia e sem uso |
| 11 | Quantos segmentos por cliente (profundidade de relacionamento) | ❌ Zero | Nenhuma tela agrega essa contagem por cliente |
| 12 | Faturamento real vs meta (Saldo TO-GO) | 🟡 Só API | `/api/faturamento` grava em `faturamento_snapshots`, mas não há parser de CSV nem conciliação nem tela (Épico 5) |
| 13 | Grau de confiança (régua de 5 cores) | ❌ Zero | Tabela `customer_faixas` removida 04/08/2026, 0 rota. As colunas equivalentes em `clientes` (`confidence_level` etc.) existem mas não são lidas/escritas por nenhum código |
| 14 | Segmentação multi-critério (risco, perfil, relacionamento) | ❌ Zero | Tabela `scoring_weights` removida 04/08/2026. Colunas `performance_band`/`credit_rating`/`wallet_share`/`qualitative_weight` em `clientes` existem, mortas |
| 15 | Método de Pareto (classificação 80/20) | ❌ Zero | Sem rota, sem tela. Tentativas órfãs (`ParetoPlanning.tsx`, `ParetoSegmentation.tsx`) removidas 04/08/2026 |
| 16 | Frequência de visitas por cliente | ❌ Zero | `visitService.ts` estava órfão, removido 04/08/2026 |

**Fechados de ponta a ponta: 7 de 16** (1, 2, 3, 4, 6, 7, 8) — o núcleo que
sustenta VPM e planejamento por segmento, mais Viabilidade (04/08/2026).
**Pela metade: 3** (5, 9, 12) — existe base ou API, falta tela ou a
segunda metade da lógica.
**Zero: 6** (10, 11, 13, 14, 15, 16) — sem schema, sem rota, sem tela.

### 16.2 Épicos do Sprint 0 (Seção 4) × status real

| Épico/Story | Status | Nota |
|---|---|---|
| E0-S1 Remover docs deprecados | ✅ Feito | Verificado 04/08/2026: nenhum dos 11 arquivos existe no repo |
| E1-S1 Banco real + schema + RLS | ✅ Feito | RLS com `USING`+`WITH CHECK`, testado com 2 tenants reais |
| E2-S1 Login funcional | ✅ Feito | Fail-closed; sessão não vaza mais entre requisições (bug real corrigido 04/08/2026) |
| E2-S2 Cadastro de Admin + convite | 🟡 Parcial | Convidar usuário **para um tenant existente** funciona ponta a ponta, agora com escolha de papel (admin vs CTV) — ver 16.5. Criar tenant novo via self-service **não existe** — tenants só nascem via SQL/seed manual |
| E3-S1 Corrigir build (`SEGMENTOS` legacy) | ➖ Obsoleto | As rotas afetadas (`/ctv`, `/governance`, `/manager`, `/admin`) foram removidas, não corrigidas |
| E3-S2 Renomear ITAA → Índice Tecnológico | 🟡 Parcial | UI 100% correta. Tabela continua `it_se_configurations` (nome técnico, não visível ao usuário) |
| E3-S3 Segmentos/cultivos configuráveis | ✅ Feito | Além do escopo original: apelidos, promoção de apelido a nome, catálogo IBGE (64 culturas da PAM, 5 com separação por safra via LSPA, ver 16.7). Abas Culturas/Cultivos unificadas em uma só, "Cultura" (19-20/08/2026) |
| E4-S1 Religar `/workspace` a dados reais | ✅ Feito | Via rota diferente da prevista: a tela foi substituída (Início), não "religada" |
| E4-S2 Religar `/ctv`/`/manager`/`/admin`/`/governance` | ➖ Obsoleto | Removidas por serem código morto (mock, zero rota apontando pra elas), não religadas |
| E5-S1 Persistir CSV | ❌ Não feito | Sem parser, sem conciliação, sem tela |

### 16.3 Como manter isto atualizado

Sempre que uma auditoria de funcionalidades rodar (grep + teste real, não
leitura de nome de arquivo), atualize as duas tabelas acima. Se um passo
mudar de status, essa é a única seção que precisa mudar — o resto do PRD
descreve o que construir, não o estado atual.

### 16.4 Decisões da reunião Daniel × Marco Polo (04/08/2026)

**Próximo passo priorizado (acordado pelos dois) — ✅ IMPLEMENTADO 04/08/2026:**
Passo 1 (Viabilidade) ganhou tela em `/workspace/viabilidade`. CTV define
meta de vendas + share estimado da safra (persistido em nova tabela
`ctv_metas`, migration `20260805130000_ctv_metas.sql`), vê o VPM necessário
(meta ÷ share), e compara contra o apetite total que já comprometeu no
planejamento (soma de `planejamento_cliente_segmento.valor_planejado_centavos`
filtrada por `ctv_id = usuário logado` — o campo já existia e já era
preenchido com o `userId` autenticado, só faltava agregar). Também mostra o
potencial bruto da carteira do tenant como contexto.

De quebra, a troca do cálculo de potencial por `calcClientVpmTotal`/
`buildItLookup` (helpers já testados em `VpmService.ts`, usados em
`dashboard-full`) corrigiu um bug real: o loop manual antigo da rota casava
só por `crop_name`, ignorando segmento — subestimava o potencial sempre que
um cultivo tinha Índice Tecnológico configurado em mais de um segmento.

**Prova real (não só build):** logado como `teste1@metacampo.com`,
`npm run lint`/`tsc --noEmit`/`npm run build` limpos, migration aplicada via
`supabase db push` (confirmado com `supabase migration list`, local=remote).
No navegador: estado vazio mostrou "Meta ainda não configurada" (não
"inviável"); salvei meta R$ 500.000,00 / share 10% → API devolveu
`vpmNecessario = R$ 5.000.000,00` (bate a conta); apetite começou em
R$ 0,00; lancei um plano real (Fazenda Boa Vista × Milho × Sementes,
R$ 152.000,00, via `/api/planejamento/cliente-segmento`, o mesmo endpoint que
o Heatmap usa) e o apetite total na tela de Viabilidade **mudou pra
R$ 152.000,00** e o déficit recalculou pra R$ 4.848.000,00 — prova de que a
soma por `ctv_id` funciona com dado gravado de verdade, não só em teoria.
Console sem erro novo (só o warning pré-existente e não relacionado do input
de cor em `SegmentSettings.tsx`, já registrado à parte).

Dado de teste ficou no tenant de `teste1@metacampo.com` (meta configurada +
1 linha de planejamento) — não removido, é dado de demonstração válido, não
lixo; avisar se quiser que eu limpe.

**Teste dirigido combinado:** Marco Polo vai atuar como um CTV fictício,
usando a lista de clientes fictícios que o Daniel já enviou, montando uma
carteira real dentro do sistema para achar atrito de UX. Login dele ainda
não foi criado (ver ação pendente abaixo).

**Discutido e adiado — não é trabalho da vez:**
- *Apelido de cultura + equivalência com IBGE*: hoje, escrever um nome
  manual em uma cultura (ex.: "Milho safrinha") a torna independente do
  catálogo IBGE, sem soma cruzada. A ideia de um "de-para" (ex.: apelido
  "HF" agregando tomate + batata do IBGE para efeito de comparação de
  mercado) foi discutida e considerada útil, mas Marco Polo decidiu
  explicitamente adiar: "vamos nascer com essa versão 1.0" sem isso. Não
  reabrir sem pedido explícito do usuário.
- *Tela de "crítica"/mata-burro*: comparar o Índice Tecnológico total
  digitado manualmente para um cultivo contra a soma decomposta por grupo
  de produto, para pegar erro de digitação do Admin. Ideia validada por
  ambos, mas sem prioridade definida — não confundir com trabalho já
  agendado.
- *Assistente de IA embarcado* (interação tipo WhatsApp): Marco Polo foi
  explícito — "isso aí é pra depois", só depois de monetizar os primeiros
  clientes. Fora de escopo até segunda ordem.

**Pedidos de UX levantados — status após 04/08/2026:**
- ✅ *Olho de mostrar/ocultar em todo campo de senha* — feito.
  `src/components/ui/PasswordInput.tsx`, aplicado em `/login`, `/register`
  e na nova troca de senha. Testado no navegador: clicar no botão muda o
  `type` de `password` para `text` e o label para "Ocultar senha".
- ✅ *Nova senha não pode ser igual à anterior* — feito, mas não como
  "senha provisória + forçar troca no primeiro login" (isso ficou de fora,
  ver nota abaixo). Implementado como uma tela de **troca de senha do
  próprio usuário**, nova (não existia nenhuma antes): aba Usuários →
  "Trocar minha senha", chama `POST /api/auth/change-password`, que
  reautentica com a senha atual via `signInWithPassword` (prova posse) e
  rejeita com 400 `PASSWORD_REUSED` se a nova senha == a atual. Testado
  ponta a ponta com `teste1@metacampo.com`: tentativa de reuso → 400 real;
  troca para senha diferente → 200 + login subsequente com a senha nova
  funcionando; revertido para a senha original ao final do teste.
- 🟡 *Senha provisória no convite + forçar troca no primeiro login* — **não
  implementado como descrito na reunião**. O fluxo de convite existente
  (`/api/tenant/invites` → `/register?invite=token`) já faz o convidado
  escolher a própria senha no primeiro acesso — não existe "senha
  provisória" nesse desenho, então não há o que forçar trocar depois.
  Mudar isso significaria trocar a arquitetura de um fluxo já testado
  ponta a ponta (Regra Nº6/Nº7) — não foi feito sem confirmação explícita.
  Se o usuário realmente quiser o padrão "admin define senha temporária →
  usuário força-troca no 1º login" em vez do link de convite atual, isso
  precisa ser pedido explicitamente antes de mexer.

**Ações pendentes fora do código:**
- ✅ Login do Marco Polo — feito em 11/08/2026, sem esperar a senha
  provisória (o usuário pediu pra seguir com o fluxo de convite existente).
  Tenant novo e isolado "Marco Polo - Teste" criado via
  `scripts/create_tenant_invite.js` (script novo, reaproveitável — schema
  de tenant/convite ainda não tem self-service, então isso substitui o SQL
  manual). Convite enviado pra `mpolo009@gmail.com`, confirmado ainda válido
  (não usado, não expirado) em 11/08/2026.
- Daniel vai conversar com Alessandro (05/08/2026) para coletar input do
  dia a dia real de um CTV — pode gerar insight de produto, sem escopo
  definido ainda.

### 16.5 Importação de clientes em massa por CTV + papéis admin/CTV (11/08/2026)

Pedido do gestor comercial: subir uma base de clientes de uma vez,
atribuindo cada um a um vendedor (CTV) específico — não só a si mesmo.
Implementado em `/workspace/clientes/importar` (link "Importar CSV" em
`/workspace/clientes`, visível só pra admin).

**Pré-requisito que o usuário pediu explicitamente antes de liberar:**
distinção real de papel (admin vs CTV), que não existia em lugar nenhum do
sistema até aqui (todo usuário nascia `role: 'user'`). Agora:
- Convite (`UserInvites.tsx`, aba Usuários) tem checkbox "Convidar como
  administrador" — grava em `tenant_invites.role` (coluna nova).
- `register/route.ts` usa o `role` do convite pro `app_metadata` do usuário
  e pra `user_tenants.role`, em vez de sempre `'user'`.
- `getAuthedContext()` (`src/lib/auth.ts`) agora expõe `role`, usado pelas
  rotas novas pra bloquear com 403 quem não é admin.
- `teste1@`/`teste2@metacampo.com` já eram `role: 'admin'` desde o seed
  original (`scripts/seed_test_tenants.js`), então não precisaram de
  migração retroativa pra testar.

**3 bugs pré-existentes corrigidos como pré-requisito** (migration
`20260811140000_import_clientes_prereqs.sql`), encontrados numa revisão de
plano antes de codar, não depois de quebrar em produção:
1. `clientes.document` era `UNIQUE` **global** (não por tenant) — dois
   tenants com cliente de mesmo CNPJ colidiriam. Nunca doeu porque a UI de
   cadastro único sempre gerou `document` fake (`doc-<timestamp>`).
2. `customer_crop_areas` não tinha nenhuma constraint contra duplicar
   cultivo no mesmo cliente — `calcVpm` soma por área, duplicar dobraria o
   VPM em silêncio.
3. Listar "membros do tenant" com o client RLS do usuário devolveria só a
   própria linha (`user_tenants_self` só permite `user_id = auth.uid()`) —
   a nova rota `GET /api/tenant/members` usa `supabaseAdmin` de propósito.

**Prova real (não só build):**
- `tsc`/`lint`/`build` limpos, migration aplicada via `supabase db push`
  (local=remote confirmado).
- Logado como `naoadmin.teste@metacampo.com` (usuário `role:'user'` criado
  de propósito pra este teste, convite + registro reais): `GET
  /api/tenant/members` e `POST /api/clientes/import` devolveram **403 real**
  os dois; a própria tela mostrou "Só administradores podem importar".
- Logado como `teste1@metacampo.com` (admin): preview (`dryRun=true`) com 5
  linhas de teste — 1 cliente novo com 2 cultivos (mesmo `documento`,
  atribuído a OUTRO CTV via e-mail, não ao próprio usuário logado), 1
  atualização de área existente (Fazenda Boa Vista, Milho 800→999ha), 1 erro
  de cultivo não cadastrado, 1 erro de e-mail de CTV inexistente — os 4
  resultados bateram exatamente com o esperado.
- Confirmação (`dryRun=false`): resumo `{criados:1, atualizados:1, erros:2}`
  idêntico ao preview. Conferido direto em `GET /api/clientes` (não só na
  resposta do import): "Fazenda Importada Um" existe com `ctvId` do CTV
  resolvido pelo CSV (não de quem estava logado) e as 2 áreas certas; "Fazenda
  Boa Vista" tem **uma única linha** de Milho com 999ha — o upsert
  substituiu em vez de duplicar, confirmando que a correção da constraint
  (item 2 acima) funciona.

Dado de teste ficou no tenant de `teste1@metacampo.com` (mesmo padrão da
Seção 16.4) — não removido, é evidência do teste, não lixo.

### 16.6 Auditoria geral — segurança, performance, saúde do código (11/08/2026)

Pedido do usuário: "auditoria geral vendo tudo que está ok e o que precisa
melhorar em performance e afins". Rodada com 3 agentes em paralelo
(segurança, performance, saúde/cobertura de teste), cada achado verificado
contra o código/banco real antes de virar ação — não é lista de sugestões
genéricas.

**🔴 Crítico — corrigido e publicado no mesmo dia, antes até de fechar a
auditoria (achados exploráveis agora, não esperaram o relatório final):**
1. `POST /api/tenant/invites` sem checagem de `role` — qualquer usuário
   autenticado podia se auto-promover a admin chamando a rota direto com
   `role:'admin'` no corpo. Furo introduzido no mesmo dia, junto com o
   sistema de papéis da Seção 16.5.
2. `GET /api/tenant/invites` também sem checagem — devolvia o token bruto
   de convites pendentes de admin pra qualquer membro do tenant; como
   `register` não confirma posse do e-mail, dava pra sequestrar o convite.
3. `POST /api/auth/login` nunca teve rate limit (diferente do `register`,
   que já tinha) — permitia brute-force sem limite. Aplicado
   `checkRateLimit` (10/min por IP), mesmo padrão do register.

Testado: usuário `role:'user'` real → 403 nas duas rotas de convite;
12 logins seguidos com senha errada → 401 até o limite, 429 depois.

**🟠 Alto — corrigido:**
4. **`POST /api/faturamento` estava completamente quebrado** — inseria
   colunas (`customer_id`, `faturado_centavos`, `safra_ref`,
   `competencia_mes/ano`, `status`) que não existem na tabela real.
   Confirmado direto contra o banco de produção: a tabela tem
   `mes/id_ctv/segmento/valor_realizado_centavos/valor_meta_centavos`,
   e estava vazia — nenhum POST nunca funcionou. Sem consumidor em `src/`
   até aqui, então corrigir o mapeamento não quebrou nada. Testado: POST
   real gravou e o GET leu de volta certo (antes só tornava a Regra Nº1
   mais urgente: o PRD dizia "grava em faturamento_snapshots" sem nunca
   ter sido provado ponta a ponta).
5. **4 rotas de configuração do tenant inteiro sem checagem de admin**:
   `classifications`, `cultures`, `indice-tecnologico` (POST/PATCH/DELETE).
   Reconfigurar Índice Tecnológico/segmentos/cultivos afeta o VPM de todos
   os CTVs — é literalmente a descrição do "parametrizador" da reunião de
   04/08 ("define os cultivos... coloca os serviços tecnológicos...").
   `grupos-economicos` ficou de fora de propósito: é usado rotineiramente
   por qualquer CTV ao cadastrar cliente (get-or-create dentro do fluxo
   normal), gatear quebraria o cadastro comum. UI de Configurações mostra
   aviso "Somente leitura" pra quem não é admin. Testado: `role:'user'` →
   403 nas 3 rotas de escrita, GET continua aberto; `grupos-economicos`
   continua liberado (testado com 201 real); admin não regrediu.
6. **`.select('*')` sem paginação real em `dashboard-full`, `viabilidade`,
   `clientes/import`** — o PostgREST trunca por volta de 1000 linhas sem
   erro nenhum; acima disso o matching de import (documento/nome+cidade+
   uf+ctv) viraria duplicata em silêncio, e os agregados de planejamento
   ficariam subcontados sem aviso. Corrigido com `fetchAllRows`
   (`src/lib/db.ts`, novo) — pagina de verdade até a página vir menor que
   o tamanho pedido, em vez de confiar no default do PostgREST.

**🟡 Médio — corrigido:**
7. `/api/clientes` buscava todas as áreas do tenant inteiro mesmo com
   `clientes` paginado, e filtrava em JS — O(página × total de áreas).
   Corrigido pra filtrar `customer_crop_areas` só pelos `customer_id` da
   página atual.
8. `ITMatrix.tsx` e `PlanejamentoTabs.tsx` recalculavam totais/agregados
   a cada render sem `useMemo` — sem custo real hoje (poucas
   culturas/segmentos/linhas), mas cresce a cada tecla digitada. Extraído
   pra `useMemo` nos dois; conferido visualmente que os totais continuam
   batendo (830+1200=2030=1650+380 no ITMatrix).

**Deliberadamente NÃO corrigido — decisão consciente, não esquecimento:**
- **Rate limiter em memória, não distribuído** (`src/lib/rateLimiter.ts`)
  — na Vercel (múltiplas instâncias), o limite é contornável distribuindo
  requests. O fix correto seria um contador compartilhado (Postgres ou
  Redis/Upstash). Redis foi removido do projeto por decisão explícita já
  registrada no `CLAUDE.md` ("nunca foi de fato usado, sem necessidade
  real") — reabrir essa decisão pra resolver um risco hoje sem tráfego
  real não parece proporcional. Se o usuário quiser, um contador via
  Postgres (sem reabrir a decisão do Redis) é a via mais barata.
- **`dashboard-full` recalcula VPM em memória a cada chamada, sem cache**
  — resolver de verdade exigiria cache com invalidação (nova
  complexidade), desproporcional ao volume real de dados hoje. O fix já
  aplicado (`fetchAllRows`) resolve a corretude (não erra mais em
  silêncio); a velocidade em escala fica pra quando houver escala.
- **Cobertura de teste das features de hoje** (Viabilidade, troca de
  senha, importação, papéis) continua zero — só testado manualmente. O
  candidato mais barato a cobrir primeiro é a lógica de agrupamento do
  import (`src/app/api/clientes/import/route.ts`), que é regra de negócio
  pura sem I/O, igual `VpmService.test.ts` — não feito ainda, fica como
  próximo passo se o usuário quiser.

**Confirmado OK, sem ação necessária:** schema sem drift entre migrations
e `docs/schema_completo_supabase.sql`; RLS por tenant ativo e correto em
todas as tabelas checadas; CSRF mitigado (`sameSite:strict` nos dois
cookies, sem GET com efeito colateral); chave hardcoded em scripts
antigos confirmada inócua (projeto Supabase morto, já documentado);
`GET /api/tenant/members` é rota sem consumidor HTTP (import resolve
in-process) — código morto opcional, não bug.

### 16.7 Árvore comercial, feedback de 13/08, saúde técnica e unificação Cultura/Cultivo (11-20/08/2026)

Esta seção estava desatualizada desde 11/08/2026 — encontrado numa auditoria
de código em 19/08/2026 (a própria árvore comercial, em produção desde
11/08, nunca tinha ganhado entrada aqui). Board de acompanhamento vivo,
compartilhado com o Marco Polo, publicado como Artifact:
https://claude.ai/code/artifact/600fc4f3-bcd2-46a4-a6a8-4c1c9d7d7ebc.

**Árvore comercial CTV → Gerente → Diretor regional (11/08/2026, commit
`f4c1747`)** — `EstruturaComercial.tsx`, aba Usuários. Rollup de VPM
verificado batendo a conta manual (R$ 1.177.000 do admin = R$ 430.000 de
carteira própria + R$ 747.000 do subordinado). "Gerente" não é um papel do
sistema — é só o campo `manager_id` em `user_tenants`, atribuível entre
membros já convidados via `PATCH /api/tenant/members` (sem `POST`
dedicado — falta uma tela de cadastro direto de gerente, registrado como
pendência no board).

**Feedback do Marco Polo de 13/08 — 9 dos 10 itens corrigidos (17/08/2026,
commits `6ee85dd` e `0502750`)**: bug de desabilitar/reabilitar cultivo,
apelido de cultivo inconsistente entre abas, variante de cultivo por safra
(Milho safra/safrinha), reordenação de abas, "Grupo de Produtos" renomeado
e apelidável por tenant, seletor de safra no Índice Tecnológico, remoção de
soma inválida entre cultivos distintos. O 10º item (nomenclatura confusa
Cultura×Cultivo) recebeu só texto explicativo nessa rodada — insuficiente,
ver unificação abaixo.

**Saúde técnica geral (18/08/2026, commits `cd3cbf0` e `2d0b5da`)**: 224
warnings de lint zerados (`no-explicit-any` retipado contra o schema real);
rate limit em 13 rotas que gravavam sem proteção; CI (`ci.yml`, type-check +
lint + test + build em todo push); Sentry migrado pro padrão compatível com
Turbopack; `error.tsx`/`global-error.tsx` com retry; lógica de agrupamento
do import de clientes extraída e testada (15 testes novos); dependências
vulneráveis de 34 para 1 (Next.js, Vitest, `uuid` morto removido) —
sobrou só `xlsx`, sem correção disponível do mantenedor, usado em 2 scripts
de extração de planilha (decisão pendente do usuário: aceitar o risco ou
remover os scripts).

**Unificação Cultura/Cultivo + catálogo IBGE com safra via LSPA
(19-20/08/2026, commit `12af6bc`)**: as abas "Culturas" (catálogo IBGE) e
"Cultivos" (dicionário do tenant) — cuja nomenclatura confusa o item 1 do
feedback de 13/08 já apontava — foram fundidas numa aba só, "Cultura"
(`SegmentSettings.tsx`; `CatalogoCulturas.tsx` removido). O campo de
adicionar cultura busca no catálogo IBGE por digitação (habilitar reaproveita
registro desativado se existir) ou cria uma cultura própria sem
correspondência no catálogo (ex.: HF); item vinculado ao catálogo ganha selo
"IBGE" e a ação "+ variante" direto na lista. Catálogo (`culturas_ibge.ts`)
continua com as 64 culturas da PAM — extraídos 96 arquivos LSPA/IBGE
(nov/2025-dez/2026) pra confirmar que só 5 produtos têm separação oficial
por safra: Milho (1ª/2ª — sem 3ª), Feijão (1ª/2ª/3ª), Batata-inglesa
(1ª/2ª/3ª), Amendoim (1ª/2ª) e Café por variedade (Arábica/Canephora); só
esses 5 foram desdobrados, nada removido. Tela informa a fonte (PAM como
base, LSPA para a separação por safra). Testado ao vivo (login
`teste1@metacampo.com`): busca no catálogo, habilitar, criar cultura livre e
criar variante persistiram via API (POST/DELETE 200 confirmados na rede,
dados de teste removidos depois).

**Padronização de UX na carteira de clientes (20/08/2026)**: nome do grupo
econômico e nomes de cultivo eram forçados para maiúsculas em alguns lugares
(cabeçalho de grupo em `/workspace/clientes`, colunas do Heatmap de
planejamento) mas não em outros (célula "Produtor", lista de Cultura) — a
mesma informação (nome de pessoa/cultivo) mudava de aparência dependendo de
onde aparecia na tela. Padronizado para o estilo normal (não forçado a
maiúsculas) nos dois pontos, consistente com o resto do app. Botão
"Colapsar/Expandir tudo" renomeado para "Agrupar/Desagrupar tudo" (pedido
explícito do Marco Polo — "colapsar" é tradução direta do inglês). Coluna
"Cultivo Principal" da lista de clientes ganhou ordenação (A-Z/Z-A),
reaproveitando a mesma infraestrutura de ordenação de Produtor/Área/VPM.

### 16.8 Configurações vira submenu + Estrutura Comercial com Regional/Distrital/Território (20/08/2026)

Pedido do usuário: o menu lateral "Configuração" (antes uma página única com
abas internas) virou um item expansível com 5 submenus navegáveis —
Índice Tecnológico, Cultura, Grupo de Produtos, Usuários, Estrutura
Comercial. `/workspace/settings/configuracao` virou um índice que redireciona
pro primeiro submenu; cada submenu é sua própria rota
(`.../cultura`, `.../grupos-de-produtos`, etc.), com um `layout.tsx`
compartilhando só o cabeçalho. `Sidebar.tsx` ganhou suporte a item de menu
com filhos (não existia antes — só lista plana); o submenu aberto é
derivado do `pathname` a cada render (não guardado em `useEffect`+`setState`,
que o lint do projeto bloqueia como anti-padrão — `react-hooks/set-state-in-effect`).

**Estrutura Comercial redesenhada**: a árvore antiga (CTV → gerente →
diretor, só por `manager_id` entre pessoas já convidadas, sem unidade
organizacional nomeada) foi substituída por uma hierarquia com código:
Regional (código, ex. "SP") → Distrital (código, ex. "SP-1") → Território
(nome, ex. "Oeste") → CTV. Decisão confirmada com o usuário: os 3 níveis
precisam de login de verdade (cada responsável é um `user_id` real de
`user_tenants`, atribuído a partir da aba Usuários — não um nome livre).
`manager_id` **não foi removido** do schema, só parou de ser a fonte desta
tela.

- **Schema**: `regionais`, `distritais`, `territorios` (migration
  `20260820120000_hierarquia_regional_distrital_territorio.sql`), cada uma
  tenant-scoped com RLS (`tenant_isolation`, mesmo padrão de
  `grupos_economicos`), FK composta pro responsável em `user_tenants`.
  Cadastro em linha (planilha): `POST /api/estrutura-comercial` faz
  get-or-create por código de Regional/Distrital e cria/atualiza o
  Território — reenviar um código já usado reatribui o responsável em vez
  de duplicar.
- **Verificado que não havia nada pra migrar**: consulta direta no banco de
  produção mostrou **zero** `manager_id` preenchido nos 4 tenants existentes
  — a afirmação anterior desta mesma seção ("árvore comercial CTV → gerente
  → diretor regional, em produção desde 11/08") descrevia dado de teste que
  não sobreviveu (provavelmente limpo ao fim daquela sessão de verificação).
  Card antigo `EstruturaComercial.tsx` (o componente da árvore por
  `manager_id`) removido — órfão, sem nenhum import restante.
- **Testado ao vivo, ponta a ponta** (login real, servidor dev contra banco
  de produção): cadastro de uma linha (Regional SP/Tenant A → Distrital
  SP-1/Nao Admin Teste → Território Oeste/CTV Nao Admin Teste) — POST 201,
  árvore renderizou os 3 níveis com rollup de VPM correto em cada um
  (R$ 747.000,00, batendo o VPM potencial do CTV). Reatribuição de
  responsável (PATCH) e exclusão em cascata de uma regional (DELETE,
  `ON DELETE CASCADE` apagou distrital e território junto) — confirmados
  via rede, não só visual. Bloqueio de não-admin confirmado nos dois
  níveis: formulário escondido na UI **e** `POST` retornando `403 FORBIDDEN`
  de verdade pro usuário `naoadmin.teste@metacampo.com` (JWT com
  `role: user`), não só escondido no front.
- **Não verificado**: isolamento de RLS entre dois tenants diferentes nas 3
  tabelas novas não foi reexercitado com `test_rls_dashboard.js` (que é
  hardcoded pras tabelas que já cobria) — a policy é estruturalmente
  idêntica à de `grupos_economicos`, já provada, mas não é o mesmo que
  rodar o teste de novo.
