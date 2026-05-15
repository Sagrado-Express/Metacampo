# MetaCampo SaaS (Antigravity V4) - Architecture Blueprint

## 🏗️ System Context
- **Name**: MetaCampo SaaS (Antigravity V4)
- **Architecture**: Memory-First Ingestion via Vercel Edge Runtime.
- **Primary Goal**: Transformar dados transientes de faturação e território em inteligência comercial (VPM, Saldo TO-GO, Pareto).

## 📥 Ingestion Protocols (Edge Runtime)
### Rules
1. **Zero Persistence for Raw Data**: NUNCA persistir dados brutos de faturação (YTD) na base de dados (Supabase). Apenas processar e guardar deltas e resumos.
2. **IBGE Validation**: Validar `COD_MUNICIPIO_IBGE` contra a tabela estática do IBGE (PAM).
3. **Auto-Linkage**: Ligar automaticamente a faturação aos budgets com base no `ID_CTV`, `Segmento` e `Mês`.

## 📊 Data Schemas

### 1. Base Clientes Território (Persistent Master)
Tabela mestre que define a hierarquia comercial e materializa o potencial (hectares).
- **Primary Key**: `DOCUMENTO`
- **Fields**: 
    - `ID_DIRETOR`, `ID_GERENTE`, `ID_CTV` (Commercial Hierarchy)
    - `DOCUMENTO` (CNPJ/CPF limpo)
    - `COD_MUNICIPIO_IBGE` (Validation: ibge_lookup)
    - `HA_SOJA`, `HA_MILHO`, `HA_ALGODAO`, `HA_CANA`, `HA_CAFE` (Base for VPM)
    - `RATING_CREDITO` (A-E)
    - `RELACIONAMENTO` (1-5)

### 2. Setup Budget (Persistent Target)
Metas financeiras fatiadas por Mês e Segmento para cada vendedor.
- **Composite Key**: `[MES, ID_CTV, SEGMENTO]`
- **Fields**:
    - `MES` (MM)
    - `ID_CTV` (Foreign Key)
    - `SEGMENTO` (Sementes, Fertilizantes, Agroquímicos, Nutrição, Biológicos, Adjuvantes)
    - `VALOR_META_R$` (Target Value)

### 3. Faturamento YTD (Transient Edge)
Ficheiro de extração de rotina (ERP). Processado em memória e descartado.
- **Fields**:
    - `DATA_NOTA` (YYYY-MM-DD)
    - `DOCUMENTO` (Foreign Key)
    - `ID_CTV` (Foreign Key)
    - `SEGMENTO_PRODUTO` (Mapping target)
    - `VALOR_LIQUIDO` (Realized Value)

## ⚙️ Computational Engines

### VPM_Engine
- **Trigger**: Após ingestão da Tabela 1 e ITAA estático.
- **Calculation**: Soma(HA_CULTURA * ITAA_CULTURA).
- **Output**: Atualiza o potencial do cliente no Radar de Caça.

### Saldo_TO_GO_Engine
- **Trigger**: Durante a ingestão transiente da Tabela 3.
- **Join Logic**: `Month(DATA_NOTA) == Budget.Month` AND `Segment == Budget.Segment`.
- **Calculation**: `TO_GO = (Target_Value) - (SUM(Realized_Value))`.
- **Output**: Velocímetro de Pacing Mensal no Cockpit.

### Pareto_Color_Engine
- **Trigger**: Após cálculo do Saldo TO-GO.
- **Logic**: 
    - Top 80% VPM = Estratégicos.
    - Se `(Faturado / VPM) > threshold` E `RATING == A|B` -> **AZUL**.
    - Se gap alto -> **VERMELHO**.
- **Output**: Card Color Tag no Workspace.

## 🚨 Error Handling
- **Unmapped Client**: Alerta e redirecionamento para Handshake.
- **Unmapped Segment**: Suspender ingestão e abrir Modal de Conciliação.
