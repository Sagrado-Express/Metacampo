/**
 * Antigravity AI - Master Blueprint V4
 * Core Types & Interfaces
 * 
 * Updated for Metadata-Oriented Architecture (Dictionary Pattern):
 * Segmento is now a dynamic string — each tenant defines their own
 * product classifications freely. Validation is done at runtime
 * via the tenant's dictionary (tenant_config_classificacoes).
 */

export type Role = 'ADMIN' | 'GESTOR' | 'CTV';

/**
 * Segmento: Now a dynamic string (internal_key from tenant dictionary).
 * Previously a fixed union type, but per meeting Daniel × Marco Polo (16/06/2026):
 * "O nome é o que menos me importa, é para que serve esse campo."
 * Each tenant defines their own classifications freely.
 */
export type Segmento = string;

export interface ITAAConfig {
  cultura: string;
  valores: Record<string, number>;
  total: number;
  mixTecnico: Record<string, number>;
}

export interface ScoringWeights {
  vpm: number;
  walletShare: number;
  creditRating: number;
  relacionamento: number;
}

export interface Cliente {
  id: string;
  nome: string;
  municipio: string;
  hectares: {
    soja: number;
    milho: number;
    algodao: number;
  };
  previsaoVendas: number;
  vpmIndividual: number;
  shareAcesso: number;
  nota: number;
  segmentacao: 'AZUL' | 'VERDE' | 'AMARELO' | 'VERMELHO';
}

export interface GoalDiagnostic {
  metaVendas: number;
  shareAlvo: number;
  vpmMinimoNecessario: number;
  isViavel: boolean;
}

export interface Budget {
  mes: string;
  cultura: string;
  segmento: Segmento;
  valor: number;
}

export interface Forecast {
  realYTD: number;
  previsaoOriginal: number;
  toGo: number;
  forecastTotal: number;
  status: 'GAP' | 'ON_TRACK' | 'OVER';
}
