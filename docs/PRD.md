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
| Banco de dados | Supabase (Postgres) | **Projeto novo** — o antigo está pausado/morto |
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

## 7. BANCO DE DADOS — TABELAS (base: `docs/schema_completo_supabase.sql`)

Tabelas confirmadas no schema (reaproveitar, aplicar em projeto novo):
`tenants`, `customers`, `customer_crop_areas`, `it_se_configurations` (renomear
referências de exibição), `setup_budgets`, `customer_forecasts`,
`faturamento_snapshots`, `customer_faixas`, `official_safra_plans`,
`scoring_weights`, `tenant_config_classificacoes`, `tenant_config_culturas`.

Todas devem ter `tenant_id UUID NOT NULL REFERENCES tenants(id)` e RLS habilitado.

---

## 13. RISCOS PRINCIPAIS

| # | Risco | Score | Mitigação |
|---|---|---|---|
| R1 | Tentar adicionar features novas antes de terminar Sprint 0 | 🔴 20 | Bloquear qualquer story fora do Épico 0-5 até Definition of Done da Seção 14 ser atingida |
| R2 | Repetir o padrão de "documentar conclusão sem verificar" | 🔴 16 | Toda story só é marcada como concluída após teste manual real, não após o agente declarar sucesso |
| R3 | Confundir tenant novo com dados de teste do projeto antigo | 🟠 9 | Projeto Supabase novo, sem migração de dados do antigo |

---

## 14. DEFINITION OF DONE — SPRINT 0

Sprint 0 só está "done" quando:
- [ ] Build compila sem erros (bug `SEGMENTOS` corrigido)
- [ ] `/login` existe, funciona, e isola corretamente 2 tenants de teste diferentes
- [ ] Todas as 5 telas (`/workspace`, `/ctv`, `/governance`, `/manager`, `/admin`)
  renderizam com dados reais do Supabase, zero referência a `mock_database.ts`
- [ ] Upload de CSV persiste em `faturamento_snapshots` (testado com arquivo real)
- [ ] Segmentos/cultivos configuráveis funcionam ligados ao banco, testado com 2 tenants
- [ ] Nenhuma menção a ITAA/IT-SE visível ao usuário
- [ ] Os 11 documentos antigos foram removidos do repositório
- [ ] Este PRD é o único documento de referência em `docs/`

---

## 15. GLOSSÁRIO

| Termo | Definição |
|---|---|
| **Índice Tecnológico** | Valor em R$/ha por cultivo × segmento, configurável por empresa (substitui ITAA/IT-SE) |
| **VPM** | Potencial financeiro total do cliente: Σ(hectares × Índice Tecnológico) |
| **Tenant** | Uma empresa cliente do SaaS. Toda tabela de negócio é isolada por `tenant_id` |
| **Saldo TO-GO** | Meta menos realizado, calculado a partir de `faturamento_snapshots` |
| **Handshake** | Congelamento/aprovação do plano comercial — gera registro imutável |
