/**
 * Antigravity AI - Master Blueprint V4
 * Core Types & Interfaces
 */

export type Role = 'ADMIN' | 'GESTOR' | 'CTV';

export type Segmento = 'Semente' | 'Fertilizante' | 'Agroquímicos' | 'Nutrição' | 'Biológico' | 'Regulador de Crescimento';

export interface ITAAConfig {
  cultura: string;
  valores: Record<Segmento, number>;
  total: number;
  mixTecnico: Record<Segmento, number>;
}

export interface ScoringWeights {
  vpm: number;
  acesso: number;
  gapTecnico: number;
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
