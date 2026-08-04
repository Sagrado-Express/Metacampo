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
| 1 | Viabilidade (meta ÷ share = VPM necessário) | 🟡 Só API | `/api/diagnostico/viabilidade` calcula certo, sem fallback fabricado — mas nenhuma tela chama essa rota. **Priorizado em reunião 04/08/2026** (ver 16.4) |
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

**Fechados de ponta a ponta: 6 de 16** (2, 3, 4, 6, 7, 8) — o núcleo que
sustenta VPM e planejamento por segmento.
**Pela metade: 4** (1, 5, 9, 12) — existe base ou API, falta tela ou a
segunda metade da lógica.
**Zero: 6** (10, 11, 13, 14, 15, 16) — sem schema, sem rota, sem tela.

### 16.2 Épicos do Sprint 0 (Seção 4) × status real

| Épico/Story | Status | Nota |
|---|---|---|
| E0-S1 Remover docs deprecados | ✅ Feito | Verificado 04/08/2026: nenhum dos 11 arquivos existe no repo |
| E1-S1 Banco real + schema + RLS | ✅ Feito | RLS com `USING`+`WITH CHECK`, testado com 2 tenants reais |
| E2-S1 Login funcional | ✅ Feito | Fail-closed; sessão não vaza mais entre requisições (bug real corrigido 04/08/2026) |
| E2-S2 Cadastro de Admin + convite | 🟡 Parcial | Convidar usuário **para um tenant existente** funciona ponta a ponta (UI em Configurações → Usuários). Criar tenant novo via self-service **não existe** — tenants só nascem via SQL/seed manual |
| E3-S1 Corrigir build (`SEGMENTOS` legacy) | ➖ Obsoleto | As rotas afetadas (`/ctv`, `/governance`, `/manager`, `/admin`) foram removidas, não corrigidas |
| E3-S2 Renomear ITAA → Índice Tecnológico | 🟡 Parcial | UI 100% correta. Tabela continua `it_se_configurations` (nome técnico, não visível ao usuário) |
| E3-S3 Segmentos/cultivos configuráveis | ✅ Feito | Além do escopo original: apelidos, promoção de apelido a nome, catálogo IBGE |
| E4-S1 Religar `/workspace` a dados reais | ✅ Feito | Via rota diferente da prevista: a tela foi substituída (Início), não "religada" |
| E4-S2 Religar `/ctv`/`/manager`/`/admin`/`/governance` | ➖ Obsoleto | Removidas por serem código morto (mock, zero rota apontando pra elas), não religadas |
| E5-S1 Persistir CSV | ❌ Não feito | Sem parser, sem conciliação, sem tela |

### 16.3 Como manter isto atualizado

Sempre que uma auditoria de funcionalidades rodar (grep + teste real, não
leitura de nome de arquivo), atualize as duas tabelas acima. Se um passo
mudar de status, essa é a única seção que precisa mudar — o resto do PRD
descreve o que construir, não o estado atual.

### 16.4 Decisões da reunião Daniel × Marco Polo (04/08/2026)

**Próximo passo priorizado (acordado pelos dois):** Passo 1 (Viabilidade)
ganha uma tela — hoje só existe a API. O CTV precisa conseguir apontar, por
produtor × cultivo × grupo de produto, onde vai realizar o VPM (comparando
potencial do agrupamento vs seu apetite), e o sistema precisa somar esse
apetite total e comparar contra a meta/orçamento individual do CTV — isso
ainda não existe (nem schema, nem rota). É a continuação natural do que já
está pronto no Passo 4/5 (apetite por segmento), não uma feature nova do zero.

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
- Daniel vai criar login/senha para Marco Polo testar como CTV — **ainda
  não feito**, decisão consciente de não disparar convite até a senha
  provisória + troca forçada no primeiro login estarem prontas.
- Daniel vai conversar com Alessandro (05/08/2026) para coletar input do
  dia a dia real de um CTV — pode gerar insight de produto, sem escopo
  definido ainda.
