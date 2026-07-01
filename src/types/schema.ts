/**
 * GTMGC Core Data Schema (V2)
 * Refined for ProductSegment vs ClientPerformanceBand
 */

export type PerformanceBand = 'AZUL' | 'VERDE' | 'AMARELO' | 'VERMELHO' | 'CINZA';

/**
 * ConfidenceLevel: Probability of closing (Grau de Confiança)
 * Régua de 4 cores validada pelo Marco Polo
 */
export type ConfidenceLevel = 'AZUL' | 'VERDE' | 'AMARELO' | 'VERMELHO';

export interface Empresa {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  themeConfig: {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
  };
  createdAt: Date;
}

export interface Safra {
  id: string;
  empresaId: string;
  name: string; // Ex: "24/25"
  isCurrent: boolean;
  startDate: Date;
  endDate: Date;
}

/**
 * AgriculturalWindow: Configuration for planting and harvest windows
 * Set by GESTOR/ADMIN per region/crop.
 */
export interface AgriculturalWindow {
  id: string;
  empresaId: string;
  cultivoId: string;
  region: string; // Ex: "Sul", "Cerrado"
  plantingStart: Date;
  plantingEnd: Date;
  harvestStart: Date;
  harvestEnd: Date;
}

/**
 * ProductSegment: Tenant-configurable product classification.
 * Updated for Dictionary Pattern — each tenant defines freely.
 */
export interface ProductSegment {
  id: string;
  empresaId: string;
  internalKey: string;       // UPPER_SNAKE_CASE canonical key
  parentKey: string | null;  // NULL = root, value = parent's internal_key
  name: string;              // custom_name displayed to user
  aliases: string[];         // Alternative names for CSV/ERP matching
  displayOrder: number;
  color: string;             // HEX color for charts
  isActive: boolean;
}

/**
 * TenantClassificacao: Product classification from tenant dictionary.
 * Maps to tenant_config_classificacoes table.
 */
export interface TenantClassificacao {
  id: string;
  tenantId: string;
  internalKey: string;
  parentKey: string | null;
  customName: string;
  aliases: string[];
  isActive: boolean;
  displayOrder: number;
  color: string;
}

/**
 * TenantCultura: Crop from tenant dictionary.
 * Maps to tenant_config_culturas table.
 */
export interface TenantCultura {
  id: string;
  tenantId: string;
  internalKey: string;
  customName: string;
  isActive: boolean;
  displayOrder: number;
}

/**
 * ITAAConfig: The "Truth Table" for VPM calculation
 * Value per hectare for a specific crop and product segment
 */
export interface ITAAConfig {
  id: string;
  empresaId: string;
  safraId: string;
  cultivoId: string;
  productSegmentId: string;
  valuePerHectare: number; // R$/ha
}

export interface User {
  id: string;
  empresaId: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'GESTOR' | 'CTV';
  active: boolean;
}

export interface Cliente {
  id: string;
  empresaId: string;
  ctvId: string;
  name: string;
  document?: string;
  location: {
    city: string;
    state: string;
    region: string; // Alignment with AgriculturalWindow
  };
  performanceBand: PerformanceBand; // Pareto population position
  confidenceLevel: ConfidenceLevel; // Probability of closing (V2)
  creditRating: 'A' | 'B' | 'C' | 'D'; // Importado via ERP/Financeiro
  walletShare: number; // % de participação no cliente
  qualitativeWeight: number; // For Pareto priority adjustments (influence/relationship)
}

export interface Cultivo {
  id: string;
  clienteId: string;
  safraId: string;
  standardCropId: string; // IBGE standardization
  name: string; // Display name
  areaHa: number;
}

/**
 * Immutable Audit Record
 */
export interface AuditLog {
  id: string;
  entityId: string; // ID of the modified record (Cliente, Cultivo, etc.)
  entityType: string;
  changedBy: string; // userId
  changedAt: Date;
  previousValue: any;
  newValue: any;
  reason?: string;
}

export interface VPMResult {
  cultivoId: string;
  totalVpm: number;
  breakdown: {
    productSegmentId: string;
    value: number;
  }[];
}

/**
 * Interface para o parmetro de URL ?mode=meeting
 */
export interface ViewModeProps {
  mode?: 'meeting' | 'default';
}

/**
 * METACAMPO Bucket-based Architecture (V3)
 * Focused on instant "TO-GO" balance and pacing.
 */

export interface CommercialSetup {
  id: string;
  month: number;
  year: number;
  ctvId: string;
  managerId: string;
  segmentId: string;
  targetValue: number; // Meta R$
}

export interface BillingSummary {
  id: string;
  cnpjClient: string;
  ctvId: string;
  segmentId: string;
  realizedValue: number;
  billingDate: Date;
}

export interface PacingData {
  month: number;
  year: number;
  ctvId: string;
  segmentId: string;
  targetValue: number;
  realizedValue: number;
  shadowTarget: number; // Where they should be today
  toGoBalance: number;
  performanceStatus: 'AHEAD' | 'BEHIND';
}

export interface IBGEBenchmark {
  ibgeCode: string; // 7 digits
  municipio: string;
  culturaNome: string;
  areaPlantadaHa: number;
  vpmHaReferencia: number; // Potential value per hectare
  produtividadeRefKg: number; // Benchmark productivity
  valorTotalBrl: number; // Total value of production in the municipality
}

// --- Novas Estruturas (Master Alignment V4) ---

export interface SetupBudget {
  empresaId: string; // Mapeia para tenant_id no banco
  mes: string; // CHAR(2)
  ctvId: string;
  segmento: string;
  valorMetaCentavos: number;
}

export interface CustomerForecast {
  empresaId: string;
  documento: string;
  mes: string;
  segmento: string;
  valorPrevistoCentavos: number;
  criadoEm: Date;
}

export interface FaturamentoSnapshot {
  empresaId: string;
  mes: string;
  ctvId: string;
  segmento: string;
  valorRealizadoCentavos: number;
  valorMetaCentavos: number;
  createdAt: Date;
}

export interface OfficialSafraPlan {
  id: string;
  empresaId: string;
  safraId: string;
  status: 'PENDING' | 'APPROVED';
  createdAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
  snapshotData: any; // JSONB
}
