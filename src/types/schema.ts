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
 * ProductSegment: Global/Tenant parameterization (seeds, fertilizers, etc.)
 */
export interface ProductSegment {
  id: string;
  empresaId: string;
  name: string; // Ex: "Sementes", "Fertilizantes"
}

/**
 * ITSEConfig: The "Truth Table" for VPM calculation
 * Value per hectare for a specific crop and product segment
 */
export interface ITSEConfig {
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
  qualitativeWeight: number; // For Pareto priority adjustments (influence)
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
 * IBGE PAM Reference (Benchmark)
 * Used for area validation and VPM calibration.
 */
export interface IBGEBenchmark {
  ibgeCode: string; // 7 digits
  municipio: string;
  culturaNome: string;
  areaPlantadaHa: number;
  vpmHaReferencia: number; // Potential value per hectare
  produtividadeRefKg: number; // Benchmark productivity
  valorTotalBrl: number; // Total value of production in the municipality
}

/**
 * Embrapa Management Benchmark (ref_tecnica_soja/etc.)
 * Stores technical recommendations per phenological stage.
 */
export interface ManagementBenchmark {
  id: string;
  culturaId: string;
  estadioNome: string; // Ex: "V3-V6", "R1"
  alvoTecnico: string; // Ex: "Lagartas", "Ferrugem"
  operacaoRecomendada: string;
  doseReferenciaLha: number; // L/ha
  ordem: number; // Sequence in the crop cycle
}

/**
 * Client Management Tracking (log_manejo_cliente)
 * Consolidated view of technical coverage vs. faturamento.
 */
export interface ClientManagementLog {
  clientId: string;
  culturaId: string;
  estadioAtual: string;
  volumeRealizado: number; // From Middleware (Sales)
  volumeNecessario: number; // Area * Dose Embrapa
  indiceManejo: number; // (%)
  lastUpdate: Date;
}
